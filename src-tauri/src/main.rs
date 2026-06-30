#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Thin wrapper. All UI is loaded from the deployed Lovable URL configured in
// tauri.conf.json -> app.windows[0].url. No native commands are exposed yet —
// future native integrations (file pickers, OS notifications) can be added
// here without affecting the web app.
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
