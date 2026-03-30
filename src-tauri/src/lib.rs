use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    env_logger::Builder::from_default_env()
        .format_timestamp_millis()
        .init();

    info!("Starting Tauri application");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ServerState {
            server_handle: Mutex::new(None),
        })
        .setup(|app| {
            info!("Tauri setup started");
            match spawn_server(app.handle()) {
                Ok(_) => {
                    info!("Server sidecar spawned successfully");
                    Ok(())
                }
                Err(e) => {
                    error!("Failed to spawn server sidecar: {}", e);
                    Err(format!("Failed to spawn server: {}", e).into())
                }
            }
        })
        .invoke_handler(tauri::generate_handler![read_file_bytes, greet, get_server_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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

    let child = std::process::Command::new("node")
        .arg(server_path)
        .env("PORT", "3000")
        .env("HOST", "0.0.0.0")
        .spawn()
        .map_err(|e| {
            error!("Failed to spawn Node.js server: {}", e);
            format!("Failed to spawn Node.js server: {}", e)
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
