<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #dde3f0;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }

        .outer { width: 100%; padding: 32px 12px; }

        .brand-bar { max-width: 560px; margin: 0 auto; text-align: center; padding-bottom: 16px; }
        .brand-bar .company {
            font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
            text-transform: uppercase; color: #2b4a9e;
        }

        .wrapper {
            max-width: 560px; width: 100%; margin: 0 auto; background: #fff;
            border-radius: 20px; overflow: hidden;
            box-shadow: 0 8px 40px rgba(43,74,158,0.13);
        }

        .header {
            background: linear-gradient(150deg, #1a3580 0%, #2b4a9e 45%, #3d65c4 100%);
            padding: 40px 24px 52px; text-align: center; position: relative;
        }
        .header::after {
            content: ''; display: block; position: absolute;
            bottom: 0; left: 0; right: 0; height: 40px; background: #fff;
            border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        }
        .header .badge {
            display: inline-block; background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.9);
            font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
            text-transform: uppercase; padding: 5px 14px; border-radius: 20px; margin-bottom: 14px;
        }
        .header .icon {
            width: 56px; height: 56px; background: rgba(255,255,255,0.15);
            border: 2px solid rgba(255,255,255,0.3); border-radius: 50%;
            display: table-cell; vertical-align: middle; text-align: center;
            margin: 0 auto 14px; font-size: 24px; line-height: 56px;
        }
        .icon-wrap { margin: 0 auto 14px; width: 56px; }
        .header h1 {
            color: #fff; margin: 0 0 6px; font-size: 22px; font-weight: 700;
            letter-spacing: -0.02em; line-height: 1.2;
        }
        .header .sub { color: rgba(255,255,255,0.72); font-size: 13px; margin: 0; }

        .body { padding: 16px 24px 28px; }
        .greeting { font-size: 16px; color: #1e293b; font-weight: 600; margin-bottom: 8px; }
        .intro { color: #64748b; font-size: 14px; line-height: 1.75; margin-bottom: 24px; }
        .section-label {
            font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
            text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;
        }

        .credentials {
            border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;
            margin-bottom: 20px; width: 100%;
        }
        .cred-row {
            display: table; width: 100%; padding: 13px 16px;
            border-bottom: 1px solid #f1f5f9; table-layout: fixed;
        }
        .cred-row:last-child { border-bottom: none; }
        .cred-row:nth-child(odd)  { background: #f8fafc; }
        .cred-row:nth-child(even) { background: #fff; }

        .cred-icon-cell { display: table-cell; vertical-align: middle; width: 42px; padding-right: 12px; }
        .cred-icon {
            width: 32px; height: 32px; border-radius: 8px;
            text-align: center; line-height: 32px; font-size: 15px;
        }
        .cred-icon.email { background: #f0fdf4; }
        .cred-icon.lock  { background: #fdf4ff; }

        .cred-info-cell { display: table-cell; vertical-align: middle; }
        .cred-label {
            font-size: 10px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 3px;
        }
        .cred-value {
            font-size: 13px; font-weight: 700; color: #1e293b;
            font-family: 'Courier New', monospace; word-break: break-all; line-height: 1.4;
        }
        .cred-value.password {
            color: #7c3aed; background: #f5f3ff; display: inline-block;
            padding: 2px 8px; border-radius: 6px; border: 1px dashed #c4b5fd;
        }

        .warning {
            background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b;
            border-radius: 10px; padding: 14px 16px; margin-bottom: 24px;
            display: table; width: 100%; table-layout: fixed;
        }
        .warning-icon-cell { display: table-cell; vertical-align: top; width: 28px; font-size: 16px; padding-top: 1px; }
        .warning-text-cell { display: table-cell; vertical-align: top; font-size: 13px; color: #78350f; line-height: 1.65; }
        .warning-text-cell strong { color: #92400e; }

        .cta-wrap { text-align: center; margin-bottom: 10px; }
        .cta-btn {
            display: inline-block; background: linear-gradient(135deg, #1a3580, #2b4a9e);
            color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700;
            padding: 14px 32px; border-radius: 10px; letter-spacing: 0.01em;
            box-shadow: 0 4px 16px rgba(43,74,158,0.28); max-width: 100%;
        }
        .cta-url { text-align: center; margin-top: 10px; font-size: 11px; color: #94a3b8; line-height: 1.6; }
        .cta-url a { color: #3B5BA5; text-decoration: none; word-break: break-all; }

        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; }
        .footer p { color: #94a3b8; font-size: 11px; line-height: 1.7; margin: 0; }
        .footer a { color: #3B5BA5; text-decoration: none; }

        .bottom-brand { max-width: 560px; margin: 16px auto 0; text-align: center; }
        .bottom-brand p { font-size: 11px; color: #94a3b8; letter-spacing: 0.04em; }

        @media only screen and (max-width: 480px) {
            .outer { padding: 20px 8px; }
            .wrapper { border-radius: 14px; }
            .header { padding: 32px 16px 48px; }
            .header h1 { font-size: 19px; }
            .body { padding: 14px 16px 24px; }
            .cred-row { padding: 11px 12px; }
            .cred-icon-cell { width: 36px; padding-right: 10px; }
            .cred-icon { width: 28px; height: 28px; line-height: 28px; font-size: 13px; border-radius: 6px; }
            .cred-value { font-size: 12px; }
            .cta-btn { display: block; width: 100%; text-align: center; padding: 14px 16px; font-size: 14px; }
            .footer { padding: 16px; }
        }
    </style>
</head>
<body>
<div class="outer">

    <!-- Top brand -->
    <div class="brand-bar">
        <span class="company">Flowcores</span>
    </div>

    <div class="wrapper">

        <!-- Header -->
        <div class="header">
            <div class="badge">Flowcores</div>
            <div class="icon-wrap">
                <div class="icon">🔐</div>
            </div>
            <h1>{{ $isReset ? 'Password Reset' : 'Account Credentials' }}</h1>
            <p class="sub">{{ $isReset ? 'Your new login details are ready' : 'Your login details are ready' }}</p>
        </div>

        <!-- Body -->
        <div class="body">
            <p class="greeting">Hello, {{ $user->name }}!</p>
            <p class="intro">
                @if ($isReset)
                    Your password has been reset by the administrator.
                    Below are your new login credentials — please keep them private and secure.
                @else
                    Welcome! Your account has been created by the administrator.
                    Below are your login credentials — please keep them private and secure.
                @endif
            </p>

            <p class="section-label">Your Login Details</p>

            <div class="credentials">
                <div class="cred-row">
                    <div class="cred-icon-cell">
                        <div class="cred-icon email">✉️</div>
                    </div>
                    <div class="cred-info-cell">
                        <div class="cred-label">Email</div>
                        <div class="cred-value">{{ $user->email }}</div>
                    </div>
                </div>
                <div class="cred-row">
                    <div class="cred-icon-cell">
                        <div class="cred-icon lock">🔑</div>
                    </div>
                    <div class="cred-info-cell">
                        <div class="cred-label">Temporary Password</div>
                        <div class="cred-value password">{{ $tempPassword }}</div>
                    </div>
                </div>
            </div>

            <div class="warning">
                <div class="warning-icon-cell">⚠️</div>
                <div class="warning-text-cell">
                    <strong>Action required:</strong> This is a temporary password.
                    Please log in immediately and update your password to something
                    secure that only you know.
                </div>
            </div>

            <div class="cta-wrap">
                <a class="cta-btn" href="{{ config('app.url') }}" target="_blank">
                    Log In to Flowcores →
                </a>
            </div>
            <p class="cta-url">
                <a href="{{ config('app.url') }}">{{ config('app.url') }}</a>
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>If you did not expect this email, please contact your administrator immediately.</p>
            <p style="margin-top:6px;">
                © {{ date('Y') }} Flowcores &nbsp;·&nbsp;
                <a href="{{ config('app.url') }}">{{ parse_url(config('app.url'), PHP_URL_HOST) }}</a>
            </p>
        </div>

    </div>

    <!-- Bottom brand -->
    <div class="bottom-brand">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>

</div>
</body>
</html>