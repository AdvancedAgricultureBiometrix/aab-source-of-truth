<?php
/**
 * smtp_config.example.php
 *
 * Copy this file to smtp_config.php ONLY if you cannot set env vars.
 *
 * SECURITY NOTE:
 * - Avoid committing / distributing real SMTP passwords.
 * - Prefer environment variables instead:
 *     AAB_SMTP_HOST, AAB_SMTP_PORT, AAB_SMTP_SECURE,
 *     AAB_SMTP_USER, AAB_SMTP_PASS, AAB_FROM_EMAIL, AAB_FROM_NAME
 */

return [
  'SMTP_HOST'   => 'smtp.yourprovider.com',
  'SMTP_PORT'   => 465,
  'SMTP_SECURE' => 'ssl',
  'SMTP_USER'   => 'you@example.com',
  'SMTP_PASS'   => 'YOUR_PASSWORD',

  'FROM_EMAIL'  => 'you@example.com',
  'FROM_NAME'   => 'AAB Secure Access',
];
