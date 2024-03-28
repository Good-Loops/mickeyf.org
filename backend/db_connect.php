<?php
// For Cloud SQL MySQL
$db_host = 'localhost'; // Use the Cloud SQL proxy address or public IP when not running on App Engine
$db_name = 'cms';
$db_user = 'cms_mickeyf';
$db_pass = '.4gUR)uzKK]1E!Xw';

// When deployed on Google App Engine, use the instance connection name.
if (getenv('GAE_ENV') === 'standard') {
    // Format: <PROJECT-ID>:<REGION>:<INSTANCE-ID>
    $db_host = ':/cloudsql/your-instance-connection-name';
}

// Use MySQLi to connect to Cloud SQL
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if (mysqli_connect_error()) {
    echo mysqli_connect_error();
    exit;
}
