<?php
// Environment variables for Cloud SQL connection.
$cloud_sql_connection_name = getenv('CLOUD_SQL_CONNECTION_NAME');
$db_user = getenv('MYSQL_USER');
$db_pass = getenv('MYSQL_PASSWORD');
$db_name = getenv('MYSQL_DATABASE'); 

// For Google App Engine deployment, use the instance connection name.
if (getenv('GAE_ENV') === 'standard') {
    $dsn = sprintf(
        'mysql:dbname=%s;unix_socket=/cloudsql/%s',
        $db_name,
        $cloud_sql_connection_name
    );
} else {
    // Fallback for local development (assuming MySQL is running on localhost)
    $dsn = sprintf('mysql:dbname=%s;host=127.0.0.1', $db_name);
}

try {
    $db = new PDO($dsn, $db_user, $db_pass);
    // Set error mode to exception to catch any errors
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected successfully";
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
    exit;
}
