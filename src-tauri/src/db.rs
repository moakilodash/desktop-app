use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::{env, fs};

#[derive(Debug, Serialize, Clone)]
pub struct Account {
    pub id: i32,
    pub name: String,
    pub network: String,
    pub datapath: Option<String>,
    pub rpc_connection_url: String,
    pub node_url: String,
    pub indexer_url: String,
    pub proxy_endpoint: String,
    pub default_lsp_url: String,
    pub maker_urls: String,
    pub default_maker_url: String,
    pub daemon_listening_port: String,
    pub ldk_peer_listening_port: String,
}

// Check if a database file exists, and create one if it does not.
pub fn init() {
    // Create database file if it doesn't exist
    if !db_file_exists() {
        create_db_file();
    }

    // Create/verify tables regardless of whether the file existed
    let path = get_db_path();
    let conn = Connection::open(path).unwrap();
    conn.execute(
        "CREATE TABLE IF NOT EXISTS 'Accounts' (
            'id'	INTEGER NOT NULL UNIQUE,
            'name'	TEXT NOT NULL,
            'network'	TEXT NOT NULL,
            'datapath'	TEXT NOT NULL,
            'rpc_connection_url'	TEXT NOT NULL,
            'node_url'  TEXT NOT NULL,
            'indexer_url'  TEXT NOT NULL,
            'proxy_endpoint'  TEXT NOT NULL,
            'default_lsp_url'  TEXT NOT NULL,
            'maker_urls'  TEXT NOT NULL DEFAULT '',
            'default_maker_url'  TEXT NOT NULL DEFAULT '',
            'daemon_listening_port'  TEXT NOT NULL DEFAULT '3001',
            'ldk_peer_listening_port'  TEXT NOT NULL DEFAULT '9735',
            PRIMARY KEY('id' AUTOINCREMENT)
        );",
        (),
    )
    .unwrap();
}

// Create the database file.
fn create_db_file() {
    let db_path = get_db_path();
    let db_dir = Path::new(&db_path).parent().unwrap();

    // If the parent directory does not exist, create it.
    if !db_dir.exists() {
        fs::create_dir_all(db_dir).unwrap();
    }

    // Create the database file.
    fs::File::create(db_path).unwrap();
}

// Check whether the database file exists.
pub fn db_file_exists() -> bool {
    let db_path = get_db_path();
    Path::new(&db_path).exists()
}

// Get the path where the database file should be located.
pub fn get_db_path() -> String {
    let app_data_dir = if cfg!(debug_assertions) {
        // During development, use the manifest directory
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    } else {
        // In production, use the local app data directory
        let local_app_data = if cfg!(target_os = "macos") {
            let home = env::var("HOME").expect("Failed to get HOME directory");
            PathBuf::from(home).join("Library/Application Support/com.kaleidoswap.dev")
        } else if cfg!(target_os = "windows") {
            let local_app_data =
                env::var("LOCALAPPDATA").expect("Failed to get LOCALAPPDATA directory");
            PathBuf::from(local_app_data).join("com.kaleidoswap.dev")
        } else {
            // Linux
            let home = env::var("HOME").expect("Failed to get HOME directory");
            PathBuf::from(home).join(".local/share/com.kaleidoswap.dev")
        };

        // Create the directory if it doesn't exist
        fs::create_dir_all(&local_app_data).expect("Failed to create app data directory");
        local_app_data
    };

    let db_path = app_data_dir.join("db/database.sqlite");

    // Ensure the parent directory exists
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).expect("Failed to create database directory");
    }

    db_path.to_str().unwrap().to_string()
}

pub fn get_accounts() -> Result<Vec<Account>, rusqlite::Error> {
    let conn = Connection::open(get_db_path())?;
    let mut stmt = conn.prepare("SELECT * FROM Accounts")?;
    let accounts = stmt
        .query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                network: row.get(2)?,
                datapath: row.get(3)?,
                rpc_connection_url: row.get(4)?,
                node_url: row.get(5)?,
                indexer_url: row.get(6)?,
                proxy_endpoint: row.get(7)?,
                default_lsp_url: row.get(8)?,
                maker_urls: row.get(9)?,
                default_maker_url: row.get(10)?,
                daemon_listening_port: row.get(11)?,
                ldk_peer_listening_port: row.get(12)?,
            })
        })?
        .map(|res| res.unwrap())
        .collect();

    Ok(accounts)
}

pub fn insert_account(
    name: String,
    network: String,
    datapath: Option<String>,
    rpc_connection_url: String,
    node_url: String,
    indexer_url: String,
    proxy_endpoint: String,
    default_lsp_url: String,
    maker_urls: String,
    default_maker_url: String,
    daemon_listening_port: String,
    ldk_peer_listening_port: String,
) -> Result<usize, rusqlite::Error> {
    let conn = Connection::open(get_db_path())?;

    // Check if an account with the same name already exists
    let mut stmt = conn.prepare("SELECT COUNT(*) FROM Accounts WHERE name = ?")?;
    let count: i64 = stmt.query_row([&name], |row| row.get(0))?;

    if count > 0 {
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(19), // SQLITE_CONSTRAINT
            Some("Account with this name already exists".to_string()),
        ));
    }

    conn.execute(
        "INSERT INTO Accounts (name, network, datapath, rpc_connection_url, node_url, indexer_url, proxy_endpoint, default_lsp_url, maker_urls, default_maker_url, daemon_listening_port, ldk_peer_listening_port) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![name, network, datapath, rpc_connection_url, node_url, indexer_url, proxy_endpoint, default_lsp_url, maker_urls, default_maker_url, daemon_listening_port, ldk_peer_listening_port],
    )
}

pub fn update_account(
    name: String,
    network: String,
    datapath: Option<String>,
    rpc_connection_url: String,
    node_url: String,
    indexer_url: String,
    proxy_endpoint: String,
    default_lsp_url: String,
    maker_urls: String,
    default_maker_url: String,
    daemon_listening_port: String,
    ldk_peer_listening_port: String,
) -> Result<usize, rusqlite::Error> {
    let conn = Connection::open(get_db_path())?;
    conn.execute(
        "UPDATE Accounts SET 
            network = ?1, 
            datapath = ?2, 
            rpc_connection_url = ?3, 
            node_url = ?4, 
            indexer_url = ?5, 
            proxy_endpoint = ?6, 
            default_lsp_url = ?7,
            maker_urls = ?8,
            default_maker_url = ?9,
            daemon_listening_port = ?10,
            ldk_peer_listening_port = ?11
         WHERE name = ?12",
        rusqlite::params![
            network,
            datapath,
            rpc_connection_url,
            node_url,
            indexer_url,
            proxy_endpoint,
            default_lsp_url,
            maker_urls,
            default_maker_url,
            daemon_listening_port,
            ldk_peer_listening_port,
            name
        ],
    )
}

pub fn get_account_by_name(name: &str) -> Result<Option<Account>, rusqlite::Error> {
    let conn = Connection::open(get_db_path())?;
    let mut stmt = conn.prepare("SELECT * FROM Accounts WHERE name = ?")?;
    let account = stmt
        .query_row([name], |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                network: row.get(2)?,
                datapath: row.get(3)?,
                rpc_connection_url: row.get(4)?,
                node_url: row.get(5)?,
                indexer_url: row.get(6)?,
                proxy_endpoint: row.get(7)?,
                default_lsp_url: row.get(8)?,
                maker_urls: row.get(9)?,
                default_maker_url: row.get(10)?,
                daemon_listening_port: row.get(11)?,
                ldk_peer_listening_port: row.get(12)?,
            })
        })
        .optional()?;

    Ok(account)
}

pub fn delete_account(name: String) -> Result<usize, rusqlite::Error> {
    // First get the account to check its datapath
    let account = get_account_by_name(&name)?;

    let conn = Connection::open(get_db_path())?;
    let result = conn.execute("DELETE FROM Accounts WHERE name = ?1", [name])?;

    // If account exists and has a datapath, delete the directory
    if let Some(account) = account {
        if let Some(datapath) = account.datapath {
            if !datapath.is_empty() {
                let full_path = PathBuf::from("../bin").join(datapath);
                let full_path_str = full_path.to_string_lossy();

                println!("Attempting to delete account folder at: {}", full_path_str);
                match std::fs::remove_dir_all(&full_path) {
                    Ok(_) => println!("Successfully deleted account folder at: {}", full_path_str),
                    Err(e) => println!(
                        "Failed to delete account folder at {}: {}",
                        full_path_str, e
                    ),
                }
            }
        }
    }

    Ok(result)
}

pub fn check_account_exists(name: &str) -> Result<bool, rusqlite::Error> {
    let conn = Connection::open(get_db_path())?;
    let mut stmt = conn.prepare("SELECT COUNT(*) FROM Accounts WHERE name = ?")?;
    let count: i64 = stmt.query_row([name], |row| row.get(0))?;
    Ok(count > 0)
}
