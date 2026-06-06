mod vault;
mod commands;

use tauri::Manager;
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "macos")]
            apply_vibrancy(&win, NSVisualEffectMaterial::HudWindow, None, None)
                .expect("vibrancy failed");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap_vault,
            commands::list_notes,
            commands::read_note,
            commands::write_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
