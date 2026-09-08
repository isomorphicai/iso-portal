/**
 * Theme Manager for Isomorphic AI Portal
 * Dynamically applies tenant UI settings & branding from MongoDB Atlas to CSS variables and document head
 */

const DEFAULT_THEME = {
  ButtonandLeftBarColor: '#0A2240',
  buttonFontColor: '#ffffff',
  BordersColor: '#578b96',
  disableButtonColor: '#c1c1c1',
  forgotFontColor: '#373737',
  loginBackgroundColor: '#FAF9F6',
  allHeaderFontSize: '1.2rem',
  allTitleFontSize: '1rem',
  instituteName: '',
  logoBigUrl: '',
  logoSmallUrl: '',
  faviconUrl: '',
  backgroudImageUrl: ''
};

/**
 * Adjust hex color brightness
 */
function adjustColorBrightness(hex, percent) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 3 && cleanHex.length !== 6) return hex;
  const fullHex = cleanHex.length === 3 
    ? cleanHex.split('').map(c => c + c).join('') 
    : cleanHex;
  const num = parseInt(fullHex, 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

/**
 * Apply tenant theme settings dynamically across the portal DOM
 * @param {Object} tenantConfig - The tenantConfig subdocument from MongoDB Atlas master.tenantInfo
 * @param {Object} tenantInfo - Optional parent tenant info (e.g. name, tenantName, code)
 */
export function applyTenantTheme(tenantConfig = {}, tenantInfo = {}) {
  const root = document.documentElement;
  if (!root) return;

  const cfg = {
    ...DEFAULT_THEME,
    ...(tenantConfig || {})
  };

  const primaryColor = cfg.ButtonandLeftBarColor || '#0A2240';
  const primaryLightColor = adjustColorBrightness(primaryColor, 15);
  const buttonFontColor = cfg.buttonFontColor || '#ffffff';
  const accentColor = cfg.BordersColor || '#C5A059';
  const accentLightColor = adjustColorBrightness(accentColor, 35) + '33';
  const accentDarkColor = adjustColorBrightness(accentColor, -15);
  const borderColor = cfg.BordersColor ? (cfg.BordersColor.length === 7 ? `${cfg.BordersColor}40` : cfg.BordersColor) : '#E2DFD6';
  const disableBtnColor = cfg.disableButtonColor || '#c1c1c1';
  const forgotFontColor = cfg.forgotFontColor || '#373737';
  const headerFontSize = cfg.allHeaderFontSize || '1.2rem';
  const titleFontSize = cfg.allTitleFontSize || '1rem';

  // Apply CSS Variables to :root for Tailwind and CSS stylesheets
  root.style.setProperty('--iso-primary', primaryColor);
  root.style.setProperty('--iso-primaryLight', primaryLightColor);
  root.style.setProperty('--iso-buttonFont', buttonFontColor);
  root.style.setProperty('--iso-accent', accentColor);
  root.style.setProperty('--iso-accentLight', accentLightColor);
  root.style.setProperty('--iso-accentDark', accentDarkColor);
  root.style.setProperty('--iso-border', borderColor);
  root.style.setProperty('--iso-borderFocus', accentColor);
  root.style.setProperty('--iso-disableButton', disableBtnColor);
  root.style.setProperty('--iso-forgotFont', forgotFontColor);
  root.style.setProperty('--iso-header-font-size', headerFontSize);
  root.style.setProperty('--iso-title-font-size', titleFontSize);

  if (cfg.loginBackgroundColor && cfg.loginBackgroundColor.trim() !== '') {
    root.style.setProperty('--iso-login-bg', cfg.loginBackgroundColor);
  }

  // Update Favicon if provided
  if (cfg.faviconUrl && cfg.faviconUrl.trim() !== '') {
    try {
      let faviconLink = document.querySelector("link[rel*='icon']");
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'shortcut icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = cfg.faviconUrl.trim();
    } catch (e) {
      console.warn('[Theme] Error updating favicon:', e);
    }
  }

  // Update Document Title with Institute Name
  const instituteName = cfg.instituteName || tenantInfo.tenantName || tenantInfo.name;
  if (instituteName && instituteName.trim() !== '') {
    document.title = `${instituteName.trim()} | isomorphic Portal`;
  } else {
    document.title = 'isomorphic Portal';
  }
}

/**
 * Reset portal theme to standard default isomorphic styles
 */
export function resetTenantTheme() {
  applyTenantTheme(DEFAULT_THEME);
}
