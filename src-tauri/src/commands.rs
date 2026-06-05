use crate::vault::{files, paths};

fn root() -> std::path::PathBuf {
    paths::default_vault_root()
}

#[tauri::command]
pub fn bootstrap_vault() -> Result<String, String> {
    let r = root();
    paths::bootstrap(&r).map_err(|e| e.to_string())?;
    Ok(r.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_notes() -> Result<Vec<String>, String> {
    files::list_notes(&root()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_note(rel: String) -> Result<String, String> {
    files::read_note(&root(), &rel).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_note(rel: String, contents: String) -> Result<(), String> {
    files::write_note(&root(), &rel, &contents).map_err(|e| e.to_string())
}
