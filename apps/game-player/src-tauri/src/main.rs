#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Read;

/// 导出的游戏数据以固定标记 + JSON 的形式追加在 exe 文件末尾。
const PAYLOAD_MARKER: &[u8] = b"\n--COBBLE-PAYLOAD--\n";

#[tauri::command]
fn load_game() -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let mut bytes = Vec::new();
    std::fs::File::open(&exe)
        .map_err(|error| error.to_string())?
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;

    let marker_len = PAYLOAD_MARKER.len();
    let position = bytes
        .windows(marker_len)
        .rposition(|window| window == PAYLOAD_MARKER)
        .ok_or_else(|| "游戏数据不存在：请使用 Cobble Studio 导出的 EXE 运行。".to_string())?;
    let payload = &bytes[position + marker_len..];
    let text = String::from_utf8(payload.to_vec()).map_err(|error| error.to_string())?;
    if text.trim().is_empty() {
        return Err("游戏数据为空".to_string());
    }
    Ok(text)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_game])
        .run(tauri::generate_context!())
        .expect("error while running Cobble Game");
}
