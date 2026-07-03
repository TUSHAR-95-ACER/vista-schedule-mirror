#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// TG Master Journal — Tauri v2 desktop shell.
//
// The main window loads the deployed Lovable URL so every future web deploy
// automatically appears in the desktop app WITHOUT a native rebuild.
// A second (hidden until requested) webview window powers the AI Workspace
// for ChatGPT / Gemini / Claude / Perplexity with persistent cookies.

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};

const MAIN_URL: &str = "https://master-journal-tg.lovable.app";

// -------- AI Workspace commands --------

fn ai_url(provider: &str) -> Option<&'static str> {
    match provider {
        "chatgpt" => Some("https://chat.openai.com/"),
        "gemini" => Some("https://gemini.google.com/app"),
        "claude" => Some("https://claude.ai/new"),
        "perplexity" => Some("https://www.perplexity.ai/"),
        _ => None,
    }
}

#[tauri::command]
async fn open_ai_workspace(app: AppHandle, provider: String) -> Result<(), String> {
    let url = ai_url(&provider).ok_or_else(|| format!("Unknown provider: {provider}"))?;
    let label = format!("ai-{provider}");

    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.show();
        let _ = existing.set_focus();
        return Ok(());
    }

    let title = match provider.as_str() {
        "chatgpt" => "AI Workspace — ChatGPT",
        "gemini" => "AI Workspace — Gemini",
        "claude" => "AI Workspace — Claude",
        "perplexity" => "AI Workspace — Perplexity",
        _ => "AI Workspace",
    };

    WebviewWindowBuilder::new(&app, &label, WebviewUrl::External(url.parse().map_err(|e: url::ParseError| e.to_string())?))
        .title(title)
        .inner_size(1280.0, 900.0)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

// -------- Tray + menu --------

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
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                if let Some(w) = tray.app_handle().get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;
    Ok(())
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    // File
    let quit = PredefinedMenuItem::quit(app, Some("Quit"))?;
    let file = Submenu::with_items(app, "File", true, &[&quit])?;

    // Edit
    let undo = PredefinedMenuItem::undo(app, None)?;
    let redo = PredefinedMenuItem::redo(app, None)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let cut = PredefinedMenuItem::cut(app, None)?;
    let copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let select_all = PredefinedMenuItem::select_all(app, None)?;
    let edit = Submenu::with_items(app, "Edit", true, &[&undo, &redo, &sep1, &cut, &copy, &paste, &select_all])?;

    // View
    let reload = MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?;
    let fullscreen = PredefinedMenuItem::fullscreen(app, None)?;
    let view = Submenu::with_items(app, "View", true, &[&reload, &fullscreen])?;

    // AI Workspace
    let ai_chatgpt = MenuItem::with_id(app, "ai-chatgpt", "Open ChatGPT", true, None::<&str>)?;
    let ai_gemini = MenuItem::with_id(app, "ai-gemini", "Open Gemini", true, None::<&str>)?;
    let ai_claude = MenuItem::with_id(app, "ai-claude", "Open Claude", true, None::<&str>)?;
    let ai_perp = MenuItem::with_id(app, "ai-perplexity", "Open Perplexity", true, None::<&str>)?;
    let ai = Submenu::with_items(app, "AI Workspace", true, &[&ai_chatgpt, &ai_gemini, &ai_claude, &ai_perp])?;

    // Window
    let minimize = PredefinedMenuItem::minimize(app, None)?;
    let close = PredefinedMenuItem::close_window(app, None)?;
    let window = Submenu::with_items(app, "Window", true, &[&minimize, &close])?;

    Menu::with_items(app, &[&file, &edit, &view, &ai, &window])
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
        .invoke_handler(tauri::generate_handler![open_ai_workspace, app_version])
        .setup(|app| {
            let handle = app.handle().clone();

            // Native menu (attached to every window)
            let menu = build_menu(&handle)?;
            app.set_menu(menu)?;
            app.on_menu_event(move |app, event| {
                let id = event.id.as_ref();
                match id {
                    "reload" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.eval("window.location.reload()");
                        }
                    }
                    id if id.starts_with("ai-") => {
                        let provider = id.trim_start_matches("ai-").to_string();
                        let _ = app.emit("menu:open-ai", provider.clone());
                        let handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = open_ai_workspace(handle, provider).await;
                        });
                    }
                    _ => {}
                }
            });

            // System tray (all platforms — no-op if unsupported)
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
