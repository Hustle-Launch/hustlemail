use base64::{engine::general_purpose, Engine};
use reqwest::{redirect::Policy, Client, Method, Url};
use serde::Serialize;
use std::{collections::HashMap, time::Duration};
use tauri::async_runtime::{spawn_blocking, Mutex};

const SERVICE: &str = "app.hustlemail.mail.clerk";
const MAX_BODY: usize = 2 * 1024 * 1024;
const MAX_RESPONSE: usize = 4 * 1024 * 1024;

pub struct NativeAuth {
    client: Client,
    // Clerk rotates its client token. Serialize requests so an older response
    // cannot replace a newer token in the operating system credential store.
    requests: Mutex<()>,
}

impl NativeAuth {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .https_only(true)
                .redirect(Policy::none())
                .timeout(Duration::from_secs(30))
                .user_agent("Hustlemail/0.2.0")
                .build()
                .expect("Could not initialize secure sign-in transport"),
            requests: Mutex::new(()),
        }
    }
}

fn clerk_host(key: &str) -> Result<String, String> {
    let encoded = key
        .strip_prefix("pk_test_")
        .or_else(|| key.strip_prefix("pk_live_"))
        .ok_or("Invalid Clerk publishable key.")?;
    let bytes = general_purpose::STANDARD_NO_PAD
        .decode(encoded)
        .or_else(|_| general_purpose::STANDARD.decode(encoded))
        .map_err(|_| "Invalid Clerk publishable key.")?;
    let decoded = String::from_utf8(bytes).map_err(|_| "Invalid Clerk publishable key.")?;
    let host = decoded
        .strip_suffix('$')
        .ok_or("Invalid Clerk publishable key.")?;
    if host.len() > 253
        || !host.contains('.')
        || host.parse::<std::net::IpAddr>().is_ok()
        || host.split('.').any(|label| {
            label.is_empty()
                || label.len() > 63
                || label.starts_with('-')
                || label.ends_with('-')
                || !label
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || c == b'-')
        })
    {
        return Err("Invalid Clerk hostname.".into());
    }
    Ok(host.to_ascii_lowercase())
}

fn request_url(key: &str, raw: &str) -> Result<(String, Url), String> {
    let host = clerk_host(key)?;
    let mut url = Url::parse(raw).map_err(|_| "Invalid sign-in request URL.")?;
    if url.scheme() != "https"
        || url.host_str() != Some(host.as_str())
        || url.port_or_known_default() != Some(443)
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
        || !url.path().starts_with("/v1/")
    {
        return Err("Sign-in requests must use the configured Clerk frontend API.".into());
    }
    let pairs: Vec<_> = url
        .query_pairs()
        .filter(|(name, _)| {
            !matches!(
                name.as_ref(),
                "_is_native" | "__dev_session" | "__clerk_db_jwt"
            )
        })
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();
    url.set_query(None);
    url.query_pairs_mut()
        .extend_pairs(pairs)
        .append_pair("_is_native", "1");
    Ok((host, url))
}

fn entry(host: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, host)
        .map_err(|_| "The system credential store is unavailable.".into())
}

#[derive(Serialize)]
pub struct ClerkResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

/// Only the configured Clerk FAPI is reachable here. The long-lived client
/// token stays in Keychain/Secret Service and never crosses the JS bridge.
#[tauri::command]
pub async fn clerk_request(
    state: tauri::State<'_, NativeAuth>,
    publishable_key: String,
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<ClerkResponse, String> {
    let (host, url) = request_url(&publishable_key, &url)?;
    let method = match method.as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        "PUT" => Method::PUT,
        "PATCH" => Method::PATCH,
        "DELETE" => Method::DELETE,
        _ => return Err("Unsupported sign-in request method.".into()),
    };
    if body.as_ref().is_some_and(|b| b.len() > MAX_BODY) {
        return Err("Sign-in request is too large.".into());
    }
    let _guard = state.requests.lock().await;
    let read_host = host.clone();
    let token = spawn_blocking(move || match entry(&read_host)?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("Unlock your system credential store to sign in.".to_string()),
    })
    .await
    .map_err(|_| "Could not read the system credential store.")??;
    let mut request = state.client.request(method, url);
    // Never accept cookies, Origin or an Authorization value from JavaScript.
    for (name, value) in headers {
        let name = name.to_ascii_lowercase();
        if matches!(
            name.as_str(),
            "content-type" | "accept" | "clerk-api-version"
        ) || name.starts_with("x-clerk-")
        {
            request = request.header(name, value);
        }
    }
    if let Some(token) = token {
        request = request.header("authorization", token);
    }
    if let Some(body) = body {
        request = request.body(body);
    }
    let response = request
        .send()
        .await
        .map_err(|_| "The sign-in service could not be reached.")?;
    read_clerk_response(response, move |token| async move {
        spawn_blocking(move || {
            let entry = entry(&host)?;
            if token.is_empty() {
                match entry.delete_credential() {
                    Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
                    Err(_) => Err("Could not clear the system sign-in credential.".to_string()),
                }
            } else {
                entry.set_password(&token).map_err(|_| {
                    "Could not save sign-in in the system credential store.".to_string()
                })
            }
        })
        .await
        .map_err(|_| "Could not update the system credential store.".to_string())?
    })
    .await
}

async fn read_clerk_response<F, Fut>(
    mut response: reqwest::Response,
    persist_token: F,
) -> Result<ClerkResponse, String>
where
    F: FnOnce(String) -> Fut,
    Fut: std::future::Future<Output = Result<(), String>>,
{
    let status = response.status().as_u16();
    let rotated = response
        .headers()
        .get("authorization")
        .map(|value| value.to_str().map(str::to_owned))
        .transpose()
        .map_err(|_| "The sign-in service returned an invalid credential header.")?;
    if let Some(token) = rotated {
        // Clerk may already have invalidated the previous token. Persist the
        // replacement before any fallible body read, while requests stay serialized.
        persist_token(token).await?;
    }
    let mut headers = HashMap::new();
    for name in ["content-type", "retry-after", "x-clerk-trace-id"] {
        if let Some(value) = response.headers().get(name).and_then(|v| v.to_str().ok()) {
            headers.insert(name.to_string(), value.to_string());
        }
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "The sign-in response was interrupted.")?
    {
        if bytes.len() + chunk.len() > MAX_RESPONSE {
            return Err("The sign-in response is too large.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    let body = String::from_utf8(bytes)
        .map_err(|_| "The sign-in service returned an invalid response.")?;
    Ok(ClerkResponse {
        status,
        headers,
        body,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn key() -> String {
        format!(
            "pk_test_{}",
            general_purpose::STANDARD_NO_PAD.encode("pilot.clerk.accounts.dev$")
        )
    }
    #[test]
    fn only_the_configured_https_api_can_receive_the_client_token() {
        for url in [
            "http://pilot.clerk.accounts.dev/v1/client",
            "https://evil.example/v1/client",
            "https://pilot.clerk.accounts.dev.evil.example/v1/client",
            "https://pilot.clerk.accounts.dev:8443/v1/client",
            "https://user@pilot.clerk.accounts.dev/v1/client",
            "https://pilot.clerk.accounts.dev/admin",
            "https://pilot.clerk.accounts.dev/v1/../admin",
        ] {
            assert!(request_url(&key(), url).is_err(), "accepted {url}");
        }
    }
    #[test]
    fn native_transport_removes_browser_credentials_and_keeps_api_parameters() {
        let (_, url) = request_url(&key(), "https://pilot.clerk.accounts.dev/v1/client?__dev_session=old&__clerk_db_jwt=old&_is_native=0&__clerk_api_version=2025-11-10").unwrap();
        let pairs: HashMap<_, _> = url.query_pairs().collect();
        assert_eq!(pairs.get("_is_native").map(|s| s.as_ref()), Some("1"));
        assert!(pairs.contains_key("__clerk_api_version"));
        assert!(!pairs.contains_key("__dev_session"));
        assert!(!pairs.contains_key("__clerk_db_jwt"));
    }
    #[test]
    fn rotated_token_is_persisted_even_when_the_response_body_is_truncated() {
        use std::io::{Read, Write};
        use std::net::TcpListener;
        use std::sync::{mpsc, Arc, Mutex as StdMutex};

        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let (persisted_tx, persisted_rx) = mpsc::channel();
        let server = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            stream
                .set_read_timeout(Some(Duration::from_secs(3)))
                .unwrap();
            let mut request = [0; 4096];
            stream.read(&mut request).unwrap();
            stream.write_all(b"HTTP/1.1 200 OK\r\nAuthorization: rotated-client-token\r\nContent-Type: application/json\r\nContent-Length: 1000\r\nConnection: close\r\n\r\n").unwrap();
            stream.flush().unwrap();
            // The old ordering waited for the entire body and lost this rotation.
            let _ = persisted_rx.recv_timeout(Duration::from_secs(3));
            stream.write_all(b"{\"partial\":").unwrap();
        });
        let saved = Arc::new(StdMutex::new(Vec::new()));
        let capture = Arc::clone(&saved);
        let result = tauri::async_runtime::block_on(async move {
            let response = Client::builder()
                .timeout(Duration::from_secs(5))
                .build()
                .unwrap()
                .get(format!("http://{address}/v1/client"))
                .send()
                .await
                .unwrap();
            read_clerk_response(response, move |token| async move {
                capture.lock().unwrap().push(token);
                persisted_tx.send(()).unwrap();
                Ok(())
            })
            .await
        });
        server.join().unwrap();
        assert_eq!(*saved.lock().unwrap(), ["rotated-client-token"]);
        assert!(
            matches!(result, Err(message) if message == "The sign-in response was interrupted.")
        );
    }

    #[test]
    fn malformed_or_local_publishable_key_hosts_are_rejected() {
        for host in [
            "127.0.0.1$",
            "localhost$",
            "good.example/path$",
            "good.example@evil.example$",
            "good.example",
        ] {
            let key = format!("pk_test_{}", general_purpose::STANDARD_NO_PAD.encode(host));
            assert!(clerk_host(&key).is_err());
        }
    }
}
