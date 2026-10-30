#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// 所有工程都保存在应用数据目录下的 projects/ 文件夹里，一个工程一个 .gproj 文件
fn projects_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let dir = base.join("projects");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn project_path(app: &tauri::AppHandle, id: &str) -> Result<PathBuf, String> {
    if id.is_empty() || id.contains(['/', '\\', ':', '.']) {
        return Err("invalid project id".to_string());
    }
    Ok(projects_dir(app)?.join(format!("{id}.gproj")))
}

#[tauri::command]
fn list_projects(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = projects_dir(&app)?;
    let mut ids = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|error| error.to_string())?;
    for entry in entries {
        let path = entry.map_err(|error| error.to_string())?.path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("gproj") {
            if let Some(stem) = path.file_stem().and_then(|stem| stem.to_str()) {
                ids.push(stem.to_string());
            }
        }
    }
    ids.sort();
    Ok(ids)
}

#[tauri::command]
fn read_project(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let path = project_path(&app, &id)?;
    fs::read_to_string(&path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_project(app: tauri::AppHandle, id: String, contents: String) -> Result<(), String> {
    let path = project_path(&app, &id)?;
    fs::write(&path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_project(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let path = project_path(&app, &id)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn projects_location(app: tauri::AppHandle) -> Result<String, String> {
    Ok(projects_dir(&app)?.display().to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_projects,
            read_project,
            write_project,
            delete_project,
            projects_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running Cobble Studio");
}
