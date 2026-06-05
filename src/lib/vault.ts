// src/lib/vault.ts
import { invoke } from "@tauri-apps/api/core";

export const bootstrapVault = () => invoke<string>("bootstrap_vault");
export const listNotes = () => invoke<string[]>("list_notes");
export const readNote = (rel: string) => invoke<string>("read_note", { rel });
export const writeNote = (rel: string, contents: string) =>
  invoke<void>("write_note", { rel, contents });
