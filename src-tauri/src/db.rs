use rusqlite::Connection;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::{env, fs};

#[derive(Debug, Serialize)]
pub struct Account {
    id: i32,
    name: String,
    network: String,
    datapath: String,
    rpc_connection_url: String,
}

// impl Default for Config {
//     fn default() -> Self {
//         Self {
//             network: "regtest".to_string(),
//             datapath: "../bin/dataldk".to_string(),
//             rpc_connection_url: "user:password@localhost:18443".to_string(),
//         }
//     }
// }

// #[derive(Debug)]
// struct Accounts {
//     id: i32,
//     name: String,
//     network: String,
//     datapath: String,
//     rpc_connection_url: String,
// }

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
            })
        })?
        .map(|res| res.unwrap())
        .collect();

    Ok(accounts)
}

pub fn insert_account(
    name: String,
    network: String,
    datapath: String,
    rpc_connection_url: String,
) -> Result<usize, rusqlite::Error> {
    let conn = Connection::open(get_db_path()).unwrap();
    conn.execute(
        "INSERT INTO Accounts (name, network, datapath, rpc_connection_url) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![name, network, datapath, rpc_connection_url],
    )
}
