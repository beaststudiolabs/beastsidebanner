<?php
/**
 * Filter Container Template
 *
 * Shows QR code on desktop, filter on mobile
 */

if (!defined('ABSPATH')) {
    exit;
}

$device_type = Beastside_Filters_Browser_Detection::get_device_type();
$is_desktop = Beastside_Filters_Browser_Detection::is_desktop();
$is_https = Beastside_Filters_Browser_Detection::is_https();
$current_url = Beastside_Filters_Browser_Detection::get_current_url();
?>

<div id="beastside-filters-root" class="beastside-filters-root" data-device="<?php echo esc_attr($device_type); ?>">

    <?php if ($is_desktop) : ?>
        <!-- Desktop: Show QR Code Modal -->
        <div class="beastside-desktop-modal">
            <div class="desktop-modal-content">
                <div class="desktop-modal-header">
                    <h2>📱 Experience BEASTSIDE Filters</h2>
                    <p>Scan this QR code with your mobile device</p>
                </div>

                <div class="desktop-qr-code">
                    <div id="qrcode-container"></div>
                </div>

                <div class="desktop-modal-instructions">
                    <div class="instruction-step">
                        <span class="step-number">1</span>
                        <span class="step-text">Open camera app on your phone</span>
                    </div>
                    <div class="instruction-step">
                        <span class="step-number">2</span>
                        <span class="step-text">Point at the QR code above</span>
                    </div>
                    <div class="instruction-step">
                        <span class="step-number">3</span>
                        <span class="step-text">Tap the notification to open</span>
                    </div>
                </div>

                <div class="desktop-modal-footer">
                    <p class="desktop-note">
                        <strong>Note:</strong> This experience is optimized for mobile devices
                    </p>
                </div>
            </div>
        </div>

        <!-- Load QR Code library -->
        <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
        <script>
            // Generate QR code for current URL
            document.addEventListener('DOMContentLoaded', function() {
                var container = document.getElementById('qrcode-container');
                if (container && typeof QRCode !== 'undefined') {
                    new QRCode(container, {
                        text: '<?php echo esc_js($current_url); ?>',
                        width: 280,
                        height: 280,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }
            });
        </script>

    <?php else : ?>
        <!-- Mobile/Tablet: Show Filter Interface -->
        <?php if (!$is_https) : ?>
            <!-- HTTPS Warning -->
            <div class="beastside-https-warning">
                <div class="https-warning-content">
                    <h3>⚠️ HTTPS Required</h3>
                    <p>Camera access requires a secure connection (HTTPS).</p>
                    <p>Please contact the site administrator to enable SSL.</p>
                </div>
            </div>
        <?php else : ?>
            <!-- Filter will be rendered here by JavaScript -->
            <!-- The main.js file will populate this container -->
        <?php endif; ?>

    <?php endif; ?>

</div>

<style>
/* Desktop Modal Styles */
.beastside-desktop-modal {
    width: 100%;
    max-width: 600px;
    margin: 60px auto;
    padding: 20px;
}

.desktop-modal-content {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 24px;
    padding: 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 107, 53, 0.2);
}

.desktop-modal-header {
    text-align: center;
    margin-bottom: 30px;
}

.desktop-modal-header h2 {
    color: #fff;
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 10px 0;
}

.desktop-modal-header p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 18px;
    margin: 0;
}

.desktop-qr-code {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 30px 0;
    padding: 20px;
    background: #fff;
    border-radius: 16px;
}

#qrcode-container {
    display: flex;
    justify-content: center;
    align-items: center;
}

#qrcode-container img {
    display: block;
    max-width: 100%;
    height: auto;
}

.desktop-modal-instructions {
    margin: 30px 0;
}

.instruction-step {
    display: flex;
    align-items: center;
    gap: 15px;
    margin: 15px 0;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border-left: 4px solid #ff6b35;
}

.step-number {
    width: 32px;
    height: 32px;
    background: #ff6b35;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    flex-shrink: 0;
}

.step-text {
    color: rgba(255, 255, 255, 0.9);
    font-size: 16px;
    font-weight: 500;
}

.desktop-modal-footer {
    text-align: center;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.desktop-note {
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    margin: 0;
}

/* HTTPS Warning Styles */
.beastside-https-warning {
    width: 100%;
    max-width: 500px;
    margin: 40px auto;
    padding: 20px;
}

.https-warning-content {
    background: rgba(239, 68, 68, 0.1);
    border: 2px solid rgba(239, 68, 68, 0.5);
    border-radius: 16px;
    padding: 30px;
    text-align: center;
}

.https-warning-content h3 {
    color: #ef4444;
    font-size: 24px;
    margin: 0 0 15px 0;
}

.https-warning-content p {
    color: #fff;
    font-size: 16px;
    margin: 10px 0;
    line-height: 1.6;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .beastside-desktop-modal {
        max-width: 100%;
        margin: 20px auto;
    }

    .desktop-modal-content {
        padding: 30px 20px;
    }

    .desktop-modal-header h2 {
        font-size: 24px;
    }

    .desktop-modal-header p {
        font-size: 16px;
    }

    .desktop-qr-code {
        padding: 15px;
    }

    .step-text {
        font-size: 14px;
    }
}
</style>
