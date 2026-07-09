#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// TG Master Journal — Tauri v2 desktop shell.
//
// The main window loads the deployed Lovable URL (configured in
// tauri.conf.json), so every future web deploy automatically appears in the
// desktop app without a native rebuild. No native menu bar is attached — the
// app uses its own in-app chrome for a polished native feel.

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

// -------- Tray --------

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Journal", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide Journal", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &sep, &quit])?;

    let _ = TrayIconBuilder::with_id("main-tray")
        .tooltip("TG Master Journal")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
            "hide" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Some(w) = tray.app_handle().get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        // Single-instance: focus the existing window instead of launching a new process.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![app_version])
        .setup(|app| {
            let handle = app.handle().clone();

            // Explicitly remove any auto-attached native menu so the window
            // shows no menu bar on Windows/Linux. macOS keeps the standard
            // system app menu (required by the platform).
            #[cfg(not(target_os = "macos"))]
            {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.remove_menu();
                }
            }

            // Windows: force the native title bar into Dark Mode so it matches
            // the app's dark theme instead of showing a bright white caption bar.
            #[cfg(target_os = "windows")]
            {
                if let Some(w) = app.get_webview_window("main") {
                    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
                    if let Ok(handle) = w.window_handle() {
                        if let RawWindowHandle::Win32(h) = handle.as_raw() {
                            unsafe {
                                use windows_sys::Win32::Foundation::{BOOL, HWND};
                                use windows_sys::Win32::Graphics::Dwm::{
                                    DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE,
                                };
                                let hwnd: HWND = h.hwnd.get() as HWND;
                                let dark: BOOL = 1;
                                let _ = DwmSetWindowAttribute(
                                    hwnd,
                                    DWMWA_USE_IMMERSIVE_DARK_MODE,
                                    &dark as *const _ as *const _,
                                    std::mem::size_of::<BOOL>() as u32,
                                );
                            }
                        }
                    }
                }
            }

            // System tray (all platforms — no-op if unsupported).
            let _ = build_tray(&handle);

            Ok(())
        })
        // Intercept main-window close on Windows: hide to tray instead of exiting.
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    #[cfg(target_os = "windows")]
                    {
                        let _ = window.hide();
                        api.prevent_close();
                    }
                    #[cfg(not(target_os = "windows"))]
                    {
                        let _ = api; // silence unused
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
