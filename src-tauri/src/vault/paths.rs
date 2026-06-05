use std::path::{Path, PathBuf};

pub const BUILTIN_DIRS: [&str; 5] = ["notes", "journal", "prompts", "prompts/_meta", "drawings"];

/// Create the opinionated built-in folder structure under `root`. Idempotent.
pub fn bootstrap(root: &Path) -> std::io::Result<()> {
    for dir in BUILTIN_DIRS {
        std::fs::create_dir_all(root.join(dir))?;
    }
    Ok(())
}

/// Default vault root: ~/quickmark (override with QUICKMARK_VAULT env for tests/dev).
pub fn default_vault_root() -> PathBuf {
    if let Ok(p) = std::env::var("QUICKMARK_VAULT") {
        return PathBuf::from(p);
    }
    let home = std::env::var("HOME").expect("HOME not set");
    PathBuf::from(home).join("quickmark")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bootstrap_creates_all_builtin_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        bootstrap(tmp.path()).unwrap();
        for dir in BUILTIN_DIRS {
            assert!(tmp.path().join(dir).is_dir(), "missing {dir}");
        }
    }

    #[test]
    fn bootstrap_is_idempotent() {
        let tmp = tempfile::tempdir().unwrap();
        bootstrap(tmp.path()).unwrap();
        bootstrap(tmp.path()).unwrap(); // must not error
    }
}
