mod clerk;

#[cfg(desktop)]
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    Emitter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(clerk::NativeAuth::new())
        .invoke_handler(tauri::generate_handler![clerk::clerk_request])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                let compose = MenuItemBuilder::with_id("compose", "New Message")
                    .accelerator("CmdOrCtrl+N")
                    .build(app)?;
                let commands = MenuItemBuilder::with_id("palette", "Command Palette")
                    .accelerator("CmdOrCtrl+K")
                    .build(app)?;
                let help =
                    MenuItemBuilder::with_id("shortcuts", "Keyboard Shortcuts").build(app)?;
                let file = SubmenuBuilder::new(app, "Hustlemail")
                    .item(&compose)
                    .separator()
                    .quit()
                    .build()?;
                let edit = SubmenuBuilder::new(app, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?;
                let view = SubmenuBuilder::new(app, "View")
                    .item(&commands)
                    .item(&help)
                    .build()?;
                let menu = MenuBuilder::new(app)
                    .items(&[&file, &edit, &view])
                    .build()?;
                app.set_menu(menu)?;
                app.on_menu_event(|app, event| {
                    let id = event.id().as_ref();
                    if matches!(id, "compose" | "palette" | "shortcuts") {
                        let _ = app.emit("mail-command", id);
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Hustlemail could not start");
}
