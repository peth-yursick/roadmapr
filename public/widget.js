/**
 * Roadmapr Embeddable Widget
 *
 * Usage:
 * <script src="https://roadmapr.xyz/widget.js"></script>
 * <roadmapr-widget project-id="uuid-here" theme="light"></roadmapr-widget>
 */

(function() {
  'use strict';

  class RoadmaprWidget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      const projectId = this.getAttribute('project-id');
      const theme = this.getAttribute('theme') || 'light';

      if (!projectId) {
        console.error('Roadmapr Widget: project-id attribute is required');
        return;
      }

      this.render(projectId, theme);
      this.setupEventListeners();
    }

    render(projectId, theme) {
      const shadow = this.shadowRoot;

      // Create styles
      const style = document.createElement('style');
      style.textContent = this.getStyles(theme);
      shadow.appendChild(style);

      // Create widget container
      const container = document.createElement('div');
      container.className = 'roadmapr-widget-container';

      // Create floating button
      const button = document.createElement('button');
      button.className = 'roadmapr-widget-button';
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>
      `;

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'roadmapr-widget-modal';

      // Create modal header
      const header = document.createElement('div');
      header.className = 'roadmapr-widget-header';
      header.innerHTML = `
        <span>Roadmap</span>
        <button class="roadmapr-widget-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>
      `;

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.className = 'roadmapr-widget-iframe';
      iframe.src = `${window.location.protocol}//${window.location.host}/embed/${projectId}`;
      iframe.setAttribute('allow', 'clipboard-write');

      // Assemble modal
      modal.appendChild(header);
      modal.appendChild(iframe);

      // Assemble container
      container.appendChild(button);
      container.appendChild(modal);
      shadow.appendChild(container);

      // Store references
      this._button = button;
      this._modal = modal;
      this._closeBtn = header.querySelector('.roadmapr-widget-close');
    }

    getStyles(theme) {
      const colors = theme === 'dark'
        ? {
            bg: '#1a1a1a',
            text: '#ffffff',
            border: '#333333',
            buttonBg: '#2563eb',
            buttonHover: '#1d4ed8'
          }
        : {
            bg: '#ffffff',
            text: '#000000',
            border: '#e5e7eb',
            buttonBg: '#2563eb',
            buttonHover: '#1d4ed8'
          };

      return `
        :host {
          all: initial;
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        .roadmapr-widget-container {
          all: initial;
        }

        .roadmapr-widget-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${colors.buttonBg};
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, background 0.2s;
          z-index: 10000;
        }

        .roadmapr-widget-button:hover {
          transform: scale(1.05);
          background: ${colors.buttonHover};
        }

        .roadmapr-widget-button svg {
          width: 24px;
          height: 24px;
        }

        .roadmapr-widget-modal {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 400px;
          height: 600px;
          max-height: calc(100vh - 120px);
          background: ${colors.bg};
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          display: none;
          flex-direction: column;
          overflow: hidden;
          z-index: 9999;
          border: 1px solid ${colors.border};
        }

        .roadmapr-widget-modal.open {
          display: flex;
        }

        .roadmapr-widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid ${colors.border};
          background: ${colors.bg};
          color: ${colors.text};
          font-weight: 600;
          font-size: 16px;
          flex-shrink: 0;
        }

        .roadmapr-widget-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.text};
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .roadmapr-widget-close:hover {
          opacity: 1;
        }

        .roadmapr-widget-close svg {
          width: 20px;
          height: 20px;
        }

        .roadmapr-widget-iframe {
          flex: 1;
          width: 100%;
          border: none;
          background: ${colors.bg};
        }

        @media (max-width: 480px) {
          .roadmapr-widget-modal {
            width: calc(100vw - 40px);
            height: calc(100vh - 120px);
            bottom: 90px;
            right: 20px;
          }

          .roadmapr-widget-button {
            bottom: 20px;
            right: 20px;
          }
        }
      `;
    }

    setupEventListeners() {
      this._button.addEventListener('click', () => this.toggle());
      this._closeBtn.addEventListener('click', () => this.close());

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.contains(e.target) && this._modal.classList.contains('open')) {
          this.close();
        }
      });

      // Close on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this._modal.classList.contains('open')) {
          this.close();
        }
      });
    }

    toggle() {
      this._modal.classList.toggle('open');
    }

    open() {
      this._modal.classList.add('open');
    }

    close() {
      this._modal.classList.remove('open');
    }
  }

  // Register the custom element
  if (!customElements.get('roadmapr-widget')) {
    customElements.define('roadmapr-widget', RoadmaprWidget);
  }

  // Auto-initialize any existing roadmapr-widget elements
  document.addEventListener('DOMContentLoaded', () => {
    const widgets = document.querySelectorAll('roadmapr-widget');
    widgets.forEach(widget => {
      // Elements are already upgraded by the browser
      // Just log for debugging
    });
  });
})();
