<?php
$db_host = "localhost";
$db_name = "cms";
$db_user = "cms_mickeyf";
$db_pass = ".4gUR)uzKK]1E!Xw";

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if (mysqli_connect_error()) {
   echo mysqli_connect_error();
   exit;
}