import XCTest

final class SmokeTests: XCTestCase {
    private func capture(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func preview() -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.hustlemail.mail")
        app.launch()
        let previewButton = app.buttons["Explore with sample mail"]
        XCTAssertTrue(previewButton.waitForExistence(timeout: 20), "Use an unconfigured simulator installation.\n\(app.debugDescription)")
        previewButton.tap()
        XCTAssertTrue(app.staticTexts["Inbox"].firstMatch.waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(app.staticTexts["Sample mailbox"].firstMatch.exists, "All subsequent actions require the sample workspace.")
        return app
    }

    private func compose(_ app: XCUIApplication) {
        app.buttons["Open navigation"].tap()
        let composeButton = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Compose")).firstMatch
        XCTAssertTrue(composeButton.waitForExistence(timeout: 5), app.debugDescription)
        composeButton.tap()
        XCTAssertTrue(app.textFields["To"].waitForExistence(timeout: 5), app.debugDescription)
    }

    func testPreviewReadingAndCompose() throws {
        let app = preview()
        capture(app, "ios-inbox")
        let firstMail = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Avery Chen, A small idea for a big week")).firstMatch
        XCTAssertTrue(firstMail.waitForExistence(timeout: 5))
        firstMail.tap()
        let back = app.buttons["Back to inbox (Esc)"]
        XCTAssertTrue(back.waitForExistence(timeout: 5), app.debugDescription)
        capture(app, "ios-reader")
        back.tap()

        // Clear only the sample workspace draft, making repeat runs deterministic.
        compose(app)
        app.buttons["Discard draft"].tap()
        XCTAssertTrue(app.buttons["Open navigation"].waitForExistence(timeout: 5))
        compose(app)
        app.textFields["To"].tap()
        app.textFields["To"].typeText("notify@uncap.us")
        app.textFields["Subject"].tap()
        app.textFields["Subject"].typeText("Simulator preview check")
        app.textViews["Message body"].tap()
        app.textViews["Message body"].typeText("This is local sample data. Sending remains disabled.")

        let send = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Sending disabled in preview")).firstMatch
        XCTAssertTrue(send.exists, app.debugDescription)
        XCTAssertFalse(send.isEnabled)
        let close = app.buttons["Save and close draft"]
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5))
        capture(app, "ios-compose")
        XCTAssertGreaterThanOrEqual(close.frame.minY, 0, "The composer header must remain onscreen while typing.")
        XCTAssertLessThan(close.frame.maxY, keyboard.frame.minY, "The composer header must remain above the keyboard.")
        XCTAssertLessThanOrEqual(send.frame.maxY, keyboard.frame.minY, "The composer footer must remain above the keyboard.")
        close.tap()

        // Reopen to verify the entered draft survived closing the composer.
        compose(app)
        XCTAssertEqual(app.textFields["To"].value as? String, "notify@uncap.us")
        XCTAssertEqual(app.textFields["Subject"].value as? String, "Simulator preview check")
        XCTAssertEqual(app.textViews["Message body"].value as? String, "This is local sample data. Sending remains disabled.")
        app.buttons["Discard draft"].tap()
    }

    func testPreviewReturnsToConnectionSetup() throws {
        let app = preview()
        app.links["Open your inbox"].tap()
        XCTAssertTrue(app.buttons["Explore with sample mail"].waitForExistence(timeout: 10), app.debugDescription)
        XCTAssertTrue(app.textFields["Convex deployment URL"].exists, app.debugDescription)
        capture(app, "ios-return-to-setup")
    }
}
