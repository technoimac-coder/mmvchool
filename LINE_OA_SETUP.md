# LINE OA notification setup

The application sends server-side notifications for room and vehicle booking events. A failed LINE request is logged but never rolls back the school transaction.

## LINE Developers

1. Enable Messaging API for the school's LINE Official Account.
2. Issue a Channel Access Token from the Messaging API channel.
3. For `push` mode, add the OA to the destination group and obtain its Group ID, or obtain the destination User ID from a verified webhook event.
4. Keep the token secret. Never paste it into GitHub, a frontend file, or a chat message.

Official documentation:

- https://developers.line.biz/en/docs/messaging-api/getting-started/
- https://developers.line.biz/en/docs/messaging-api/sending-messages/

## HostAtom Plesk

Append the following values to `httpdocs/api/config.local.php` using Plesk File Manager:

```php
$mmvLineChannelAccessToken = 'CHANNEL_ACCESS_TOKEN';
$mmvLineMode = 'push';
$mmvLineTargetIds = ['USER_OR_GROUP_ID'];
```

To send every notification to all OA friends instead, explicitly select broadcast mode:

```php
$mmvLineMode = 'broadcast';
$mmvLineTargetIds = [];
```

Broadcast messages consume the LINE OA message quota based on recipient count. Push mode is the safer default.

An authenticated administrator can inspect the non-secret status with `GET /api/line-status.php` and send one test message with an authenticated, CSRF-protected `POST` request containing `{"action":"test"}`.
