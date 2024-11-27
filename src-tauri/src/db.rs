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
}

// Check if a database file exists, and create one if it does not.
pub fn init() {
    if !db_file_exists() {
        create_db_file();

        // Create the tables.
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
                PRIMARY KEY('id' AUTOINCREMENT)
            );",
            (),
        )
        .unwrap();
    }
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
    let mut db_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    db_path.push("./db/database.sqlite");
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
        "INSERT INTO Accounts (name, network, datapath, rpc_connection_url, node_url, indexer_url, proxy_endpoint, default_lsp_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![name, network, datapath, rpc_connection_url, node_url, indexer_url, proxy_endpoint, default_lsp_url],
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
) -> Result<usize, rusqlite::Error> {
    let conn = Connection::open(get_db_path())?;
    conn.execute(
        "UPDATE Accounts SET name = ?1, network = ?2, datapath = ?3, rpc_connection_url = ?4, node_url = ?5, indexer_url = ?6, proxy_endpoint = ?7, default_lsp_url = ?8 WHERE name = ?9",
        rusqlite::params![name, network, datapath, rpc_connection_url, node_url, indexer_url, proxy_endpoint, default_lsp_url, name],
    )
}

pub fn get_account_by_name(name: &str) -> Result<Option<Account>, rusqlite::Error> {
    let conn = Connection::open(get_db_path())?;
    let mut stmt = conn.prepare("SELECT * FROM Accounts WHERE name = ?")?;
    let account = stmt.query_row([name], |row| {
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
        })
    }).optional()?;
    
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
                    Err(e) => println!("Failed to delete account folder at {}: {}", full_path_str, e),
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
