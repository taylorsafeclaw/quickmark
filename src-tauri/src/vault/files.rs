// vault file operations — implemented in Tasks 4-6
use std::path::Path;

/// Return all `.md` file paths under `root`, relative to `root`, sorted.
pub fn list_notes(root: &Path) -> std::io::Result<Vec<String>> {
    let mut out = Vec::new();
    collect(root, root, &mut out)?;
    out.sort();
    Ok(out)
}

fn collect(root: &Path, dir: &Path, out: &mut Vec<String>) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            collect(root, &path, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            let rel = path.strip_prefix(root).unwrap().to_string_lossy().to_string();
            out.push(rel);
        }
    }
    Ok(())
}

/// Read a note at `rel` (relative to `root`) as a UTF-8 string.
pub fn read_note(root: &Path, rel: &str) -> std::io::Result<String> {
    std::fs::read_to_string(root.join(rel))
}

/// Atomically write `contents` to `rel` (relative to `root`):
/// write to a temp file in the same dir, then rename over the target.
pub fn write_note(root: &Path, rel: &str, contents: &str) -> std::io::Result<()> {
    let target = root.join(rel);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = target.with_extension("md.tmp");
    std::fs::write(&tmp, contents)?;
    std::fs::rename(&tmp, &target)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn lists_md_files_relative_and_sorted() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join("notes")).unwrap();
        fs::write(root.join("notes/b.md"), "b").unwrap();
        fs::write(root.join("notes/a.md"), "a").unwrap();
        fs::write(root.join("notes/ignore.txt"), "x").unwrap();
        let got = list_notes(root).unwrap();
        assert_eq!(got, vec!["notes/a.md".to_string(), "notes/b.md".to_string()]);
    }

    #[test]
    fn reads_note_contents() {
        let tmp = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(tmp.path().join("notes")).unwrap();
        std::fs::write(tmp.path().join("notes/a.md"), "# Hello").unwrap();
        assert_eq!(read_note(tmp.path(), "notes/a.md").unwrap(), "# Hello");
    }

    #[test]
    fn writes_note_atomically_and_no_tmp_left() {
        let tmp = tempfile::tempdir().unwrap();
        write_note(tmp.path(), "notes/new.md", "content").unwrap();
        assert_eq!(read_note(tmp.path(), "notes/new.md").unwrap(), "content");
        assert!(!tmp.path().join("notes/new.md.tmp").exists(), "temp file leaked");
    }

    #[test]
    fn write_creates_missing_parent_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        write_note(tmp.path(), "deep/nested/x.md", "ok").unwrap();
        assert_eq!(read_note(tmp.path(), "deep/nested/x.md").unwrap(), "ok");
    }
}
