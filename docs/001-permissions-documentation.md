# TabTreeTracker Permissions Documentation

## Overview

This document explains why each permission is required for the TabTreeTracker Chrome extension to function properly. We follow the principle of least privilege and only request permissions that are essential for core functionality.

## Required Permissions

### Core Permissions

#### `tabs`
**Purpose**: Track tab creation, updates, and closure events
**Usage**: 
- Monitor when new tabs are created and their parent relationships
- Track navigation within tabs (URL changes)
- Detect when tabs are closed to update the tree structure
- Get tab information (title, URL) for tree nodes

**Privacy Impact**: Low - Only accesses tab metadata, not content
**Alternative**: None - Essential for core tab tracking functionality

#### `activeTab`
**Purpose**: Access the currently active tab for content analysis
**Usage**:
- Inject content scripts for word frequency analysis (when enabled)
- Only used when user has opted into content analysis

**Privacy Impact**: Medium - Can access page content when content analysis is enabled
**Alternative**: Could be made optional, but would disable content analysis feature

#### `storage`
**Purpose**: Persist tab tree data and user preferences
**Usage**:
- Save tab tree structure across browser sessions
- Store user configuration (excluded domains, timezone, content analysis consent)
- Cache tracking state and viewer preferences

**Privacy Impact**: Low - All data stored locally, never transmitted
**Alternative**: None - Essential for data persistence

#### `webNavigation`
**Purpose**: Detect navigation events and tab relationships
**Usage**:
- Track when tabs navigate to new URLs
- Detect parent-child relationships between tabs
- Monitor navigation history within tabs

**Privacy Impact**: Low - Only accesses navigation metadata
**Alternative**: Could use tabs API alone, but would miss some navigation events

#### `scripting`
**Purpose**: Inject content scripts for page analysis
**Usage**:
- Execute word frequency analysis on pages (when user consents)
- Only injected on http/https pages
- Only when content analysis is enabled in settings

**Privacy Impact**: Medium - Can execute code in web pages
**Alternative**: Could be removed if content analysis feature is disabled

### Optional/Utility Permissions

#### `alarms`
**Purpose**: Scheduled cleanup and maintenance tasks
**Usage**:
- Periodic cleanup of old tab data
- Maintenance tasks for performance optimization

**Privacy Impact**: None - No access to user data
**Alternative**: Could use setTimeout, but less reliable across extension lifecycle

#### `fileSystem` (Deprecated)
**Purpose**: Originally intended for file operations
**Usage**: Currently unused - should be removed
**Status**: ⚠️ **SHOULD BE REMOVED** - Not currently used

**Privacy Impact**: None - Not actively used
**Alternative**: Use download API for file operations

## Host Permissions

#### `http://*/*` and `https://*/*`
**Purpose**: Access web pages for content analysis
**Usage**:
- Inject content scripts for word frequency analysis
- Only when user has enabled content analysis
- Filtered by excluded domains list

**Privacy Impact**: High - Broad access to all websites
**Mitigation**: 
- Only used when content analysis is explicitly enabled
- Respects excluded domains configuration
- Content analysis can be disabled entirely
- No data transmitted to external servers

**Recommendations for Improvement**:
1. Consider using optional permissions for content analysis
2. Implement more granular domain-specific permissions
3. Add clear user consent flow explaining data usage

## Security Measures

### Data Protection
- All data stored locally using Chrome's storage API
- URLs are sanitized to remove sensitive query parameters
- No data transmitted to external servers
- User can disable content analysis entirely

### Content Script Security
- Scripts only injected on http/https URLs
- Excluded domains are respected
- Content analysis requires explicit user consent
- Scripts are minimal and focused on word frequency only

### Permission Minimization
- Content analysis is opt-in (disabled by default)
- Excluded domains allow users to block sensitive sites
- Regular cleanup prevents data accumulation

## User Control

### Privacy Settings
- Content analysis can be completely disabled
- Excluded domains list for sensitive sites
- Clear explanation of what data is collected
- Local storage only - no external transmission

### Transparency
- Clear documentation of permission usage
- User-friendly explanations in options page
- Ability to review and delete stored data

## Recommendations for Future Versions

### High Priority
1. **Remove unused `fileSystem` permission**
2. **Implement optional permissions for content analysis**
3. **Add domain-specific permission requests**

### Medium Priority
1. **Implement permission request flow with explanations**
2. **Add data export/import functionality**
3. **Implement more granular content analysis controls**

### Low Priority
1. **Consider manifest v3 optional permissions API**
2. **Add permission usage analytics (privacy-preserving)**
3. **Implement permission audit logging**

## Compliance Notes

### Chrome Web Store Requirements
- All permissions are documented and justified
- Privacy policy explains data usage
- User consent obtained for content analysis
- No unnecessary permissions requested

### Privacy Regulations
- GDPR: User consent for content analysis, data portability
- CCPA: Clear disclosure of data collection practices
- General: Principle of data minimization followed

## Version History

### v1.0 (Current)
- Initial permission set
- Basic privacy controls
- Local storage only

### Future Versions
- Optional permissions implementation
- Enhanced privacy controls
- Granular domain permissions

---

*Last Updated: [Current Date]*
*Review Schedule: Quarterly*
