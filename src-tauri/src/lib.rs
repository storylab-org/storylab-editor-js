use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, Emitter};
use tauri::menu::{MenuBuilder, SubmenuBuilder, MenuItem, PredefinedMenuItem};
use log::{info, debug, error};

pub struct ServerState {
    server_handle: Mutex<Option<std::process::Child>>,
}

fn compute_server_status(handle_is_some: bool) -> String {
    if handle_is_some {
        "Server is running on port 3000".to_string()
    } else {
        "Server is not running".to_string()
    }
}

#[tauri::command]
async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    debug!("read_file_bytes command called with path: {}", path);
    std::fs::read(&path).map_err(|e| {
        error!("Failed to read file {}: {}", path, e);
        e.to_string()
    })
}

#[tauri::command]
fn greet(name: &str) -> String {
    debug!("greet command called with name: {}", name);
    let message = format!("Hello, {}! You've been greeted from Rust!", name);
    info!("returning greeting: {}", message);
    message
}

#[tauri::command]
async fn get_server_status(state: State<'_, ServerState>) -> Result<String, String> {
    debug!("get_server_status command called");
    let handle = state.server_handle.lock().unwrap();
    let status = compute_server_status(handle.is_some());
    info!("server status: {}", status);
    Ok(status)
}

#[tauri::command]
async fn save_export_file(filename: String, data: Vec<u8>) -> Result<String, String> {
    debug!("save_export_file command called for: {}", filename);

    // filename is now a full path from the dialog, not just a filename
    let file_path = std::path::PathBuf::from(&filename);

    // Ensure parent directory exists
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            error!("Failed to create directory {}: {}", parent.display(), e);
            e.to_string()
        })?;
    }

    // Write file to disk
    std::fs::write(&file_path, data).map_err(|e| {
        error!("Failed to write export file {}: {}", file_path.display(), e);
        e.to_string()
    })?;

    info!("Export file saved to: {}", file_path.display());
    Ok(file_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    env_logger::Builder::from_default_env()
        .format_timestamp_millis()
        .init();

    info!("Starting Tauri application");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(ServerState {
            server_handle: Mutex::new(None),
        })
        .setup(|app| {
            info!("Tauri setup started");
            match spawn_server(app.handle()) {
                Ok(_) => {
                    info!("Server sidecar spawned successfully");
                }
                Err(e) => {
                    error!("Failed to spawn server sidecar: {}", e);
                    return Err(format!("Failed to spawn server: {}", e).into());
                }
            }

            // Build application menu
            if let Err(e) = build_menu(app.handle()) {
                error!("Failed to build menu: {}", e);
                return Err(format!("Failed to build menu: {}", e).into());
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_file_bytes, greet, get_server_status, save_export_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_menu(app: &tauri::AppHandle) -> Result<(), String> {
    debug!("building application menu");

    let menu = MenuBuilder::new(app)
        .items(&[
            &SubmenuBuilder::new(app, "File")
                .items(&[
                    &MenuItem::with_id(app, "new-chapter", "New Chapter", true, None::<&str>).map_err(|e| e.to_string())?,
                    &PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
                    &SubmenuBuilder::new(app, "Export As")
                        .item(&MenuItem::with_id(app, "export-markdown", "Markdown", true, None::<&str>).map_err(|e| e.to_string())?)
                        .item(&MenuItem::with_id(app, "export-html", "HTML", true, None::<&str>).map_err(|e| e.to_string())?)
                        .item(&MenuItem::with_id(app, "export-epub", "EPUB", true, None::<&str>).map_err(|e| e.to_string())?)
                        .item(&MenuItem::with_id(app, "export-car", "CAR Archive", true, None::<&str>).map_err(|e| e.to_string())?)
                        .build()
                        .map_err(|e| e.to_string())?,
                    &SubmenuBuilder::new(app, "Import From")
                        .item(&MenuItem::with_id(app, "import-epub", "EPUB", true, None::<&str>).map_err(|e| e.to_string())?)
                        .item(&MenuItem::with_id(app, "import-car", "CAR Archive", true, None::<&str>).map_err(|e| e.to_string())?)
                        .build()
                        .map_err(|e| e.to_string())?,
                    &PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
                    &PredefinedMenuItem::quit(app, None).map_err(|e| e.to_string())?,
                ])
                .build()
                .map_err(|e| e.to_string())?,
            &SubmenuBuilder::new(app, "Edit")
                .items(&[
                    &MenuItem::with_id(app, "edit-undo", "Undo", true, None::<&str>).map_err(|e| e.to_string())?,
                    &MenuItem::with_id(app, "edit-redo", "Redo", true, None::<&str>).map_err(|e| e.to_string())?,
                    &PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?,
                    &MenuItem::with_id(app, "find-replace", "Find & Replace", true, None::<&str>).map_err(|e| e.to_string())?,
                ])
                .build()
                .map_err(|e| e.to_string())?,
            &SubmenuBuilder::new(app, "View")
                .items(&[
                    &MenuItem::with_id(app, "view-draft-board", "Draft Board", true, None::<&str>).map_err(|e| e.to_string())?,
                ])
                .build()
                .map_err(|e| e.to_string())?,
            &SubmenuBuilder::new(app, "Help")
                .item(&MenuItem::with_id(app, "show-help", "Show Help", true, None::<&str>).map_err(|e| e.to_string())?)
                .build()
                .map_err(|e| e.to_string())?,
        ])
        .build()
        .map_err(|e| e.to_string())?;

    app.set_menu(menu).map_err(|e| e.to_string())?;

    app.on_menu_event(move |app, event| {
        let payload = match event.id().0.as_str() {
            "new-chapter"     => "action:new-chapter",
            "export-markdown" => "export:markdown",
            "export-html"     => "export:html",
            "export-epub"     => "export:epub",
            "export-car"      => "export:car",
            "import-epub"     => "import:epub",
            "import-car"      => "import:car",
            "edit-undo"       => "action:undo",
            "edit-redo"       => "action:redo",
            "find-replace"    => "action:find-replace",
            "view-draft-board" => "action:view-draft-board",
            "show-help"       => "action:help",
            _                 => return,
        };
        if let Err(e) = app.emit("menu-event", payload) {
            error!("Failed to emit menu-event: {}", e);
        }
    });

    info!("Application menu built successfully");
    Ok(())
}

fn find_node_executable() -> Result<String, String> {
    // Try to find node executable in multiple ways

    // First, try to use 'which' command (Unix-like systems)
    let which_output = std::process::Command::new("which")
        .arg("node")
        .output();

    if let Ok(output) = which_output {
        if output.status.success() {
            if let Ok(path) = String::from_utf8(output.stdout) {
                return Ok(path.trim().to_string());
            }
        }
    }

    // Try common installation locations
    let common_paths = vec![
        "/usr/local/bin/node",
        "/usr/bin/node",
        "/opt/homebrew/bin/node",  // M1/M2 Macs
        "/opt/local/bin/node",      // MacPorts
    ];

    for path in common_paths {
        if std::path::Path::new(path).exists() {
            debug!("Found node at: {}", path);
            return Ok(path.to_string());
        }
    }

    // Fallback: just try "node" and let the error message be helpful
    Err("Node.js executable not found. Please ensure Node.js is installed and in PATH.".to_string())
}

fn spawn_server(app: &AppHandle) -> Result<(), String> {
    debug!("spawn_server called");

    let server_path = if cfg!(debug_assertions) {
        // In development, use the server from the source directory
        debug!("Using development server path");
        "../server/dist/server.js"
    } else {
        // In production, the server will be bundled in the app resources
        debug!("Using production server path");
        "./server/dist/server.js"
    };

    info!("Spawning Node.js server at path: {}", server_path);

    // Find the node executable with robust search
    let node_path = find_node_executable().unwrap_or_else(|e| {
        error!("{}", e);
        "node".to_string() // Fallback, may still fail but with clearer error
    });

    let child = std::process::Command::new(&node_path)
        .arg(server_path)
        .env("PORT", "3000")
        .env("HOST", "0.0.0.0")
        .spawn()
        .map_err(|e| {
            error!("Failed to spawn Node.js server with '{}': {}", node_path, e);
            format!("Failed to spawn Node.js server: {}. Node executable: {}", e, node_path)
        })?;

    debug!("Node.js process spawned successfully");

    let server_state = app.state::<ServerState>();
    let mut handle = server_state.server_handle.lock().unwrap();
    *handle = Some(child);

    info!("Node.js server started on port 3000");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_with_name() {
        let result = greet("Alice");
        assert!(result.contains("Alice"));
        assert!(result.contains("Rust"));
    }

    #[test]
    fn greet_empty_string() {
        let result = greet("");
        assert!(result.contains("Rust"));
    }

    #[test]
    fn compute_server_status_with_handle() {
        let status = compute_server_status(true);
        assert_eq!(status, "Server is running on port 3000");
    }

    #[test]
    fn compute_server_status_without_handle() {
        let status = compute_server_status(false);
        assert_eq!(status, "Server is not running");
    }
}
