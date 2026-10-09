import React from 'react';
import { Plus, X, Globe, Loader2, Copy } from 'lucide-react';
import { TabInfo } from '../../security/ipc-contracts';

interface TabBarProps {
  tabs: TabInfo[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            title={tab.title || tab.url}
          >
            {tab.isLoading ? (
              <Loader2
                size={14}
                className="animate-spin"
                style={{ marginRight: 6, flexShrink: 0, color: '#4a72ff' }}
              />
            ) : (
              <Globe size={14} style={{ marginRight: 6, flexShrink: 0, opacity: 0.7 }} />
            )}

            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                fontSize: 12,
              }}
            >
              {tab.title || 'New Tab'}
            </span>

            {tab.profileId !== 'default' && (
              <span
                style={{
                  fontSize: 10,
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  padding: '1px 5px',
                  borderRadius: 3,
                  marginLeft: 4,
                  marginRight: 2,
                  flexShrink: 0,
                }}
              >
                {tab.profileId}
              </span>
            )}

            {tabs.length > 1 && (
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  marginLeft: 4,
                  padding: 2,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                title="Close Tab (Cmd/Ctrl+W)"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onNewTab}
        style={{
          background: 'none',
          border: 'none',
          color: '#9ba1b0',
          cursor: 'pointer',
          padding: '6px 8px',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#282a36')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        title="New Tab (Cmd/Ctrl+T)"
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

