import{i as t,_ as e,n as i,r as s,t as a,a as r,b as n,e as o,s as c,W as l}from"./styles-Bq46uLpA.js";let d=class extends r{setConfig(t){this._config=t}_valueChanged(t){if(!this._config||!this.hass)return;const e=t.target,i=e.configValue;if(!i)return;const s=void 0!==e.checked?e.checked:e.value;if(this._config[i]===s)return;const a={...this._config};""===s&&void 0===e.checked?delete a[i]:a[i]=s,this._config=a,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}render(){return this.hass&&this._config?n`
      <div class="card-config">
        <ha-textfield label="Title" .value=${this._config.title||""} .configValue=${"title"} @input=${this._valueChanged}></ha-textfield>
        <ha-textfield
          label="Server URL (optional)"
          .value=${this._config.server_url||""}
          .configValue=${"server_url"}
          helper="Defaults to localhost:8080/ws"
          @input=${this._valueChanged}
        ></ha-textfield>
        <div class="side-by-side">
          <ha-formfield label="Auto Play">
            <ha-switch .checked=${!1!==this._config.auto_play} .configValue=${"auto_play"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
        </div>
      </div>
    `:n``}};d.styles=t`
    .card-config {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .side-by-side {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    ha-textfield {
      width: 100%;
    }
    ha-formfield {
      padding-bottom: 8px;
    }
  `,e([i({attribute:!1})],d.prototype,"hass",void 0),e([s()],d.prototype,"_config",void 0),d=e([a("voice-receiving-card-editor")],d);const h={STREAM_CHECK_INTERVAL:5e3},g={LOW:50,MEDIUM:150};let u=class extends r{constructor(){super(...arguments),this.status="disconnected",this.errorMessage="",this.latency=0,this.availableStreams=[],this.selectedStream=null,this.isWatching=!1,this.isActive=!1,this.webrtc=null,this.animationFrame=null,this.watchInterval=null}static get styles(){return[c,t`
        .controls {
          display: flex;
          align-items: center;
          justify-content: center; /* Center the main button */
          gap: 16px;
          margin-bottom: 16px;
        }

        .action-button {
          width: 140px; /* Wider button for text */
          height: 50px;
          border-radius: 25px;
          border: none;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .action-button.start {
          background: #2196f3;
          color: white;
        }

        .action-button.start:hover {
          background: #1976d2;
          box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
        }

        .action-button.stop {
          background: #f44336;
          color: white;
          animation: pulse-red 2s infinite;
        }

        .action-button.stop:hover {
          background: #d32f2f;
          box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
        }

        @keyframes pulse-red {
          0% {
            box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
          }
        }

        .stream-list {
          width: 100%;
          max-height: 150px;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 4px;
          margin-top: 16px;
          border-top: 1px solid var(--divider-color);
          padding-top: 8px;
        }

        .stream-item {
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--divider-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stream-item:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .stream-item.active {
          background: rgba(var(--primary-color-rgb, 33, 150, 243), 0.1);
          color: var(--card-primary-color);
          font-weight: 500;
        }

        .visualization {
          width: 100%;
          height: 80px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .connection-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 6px;
        }

        .connection-indicator.connected {
          background: #4caf50;
        }
        .connection-indicator.connecting {
          background: #ff9800;
          animation: blink 1s infinite;
        }
        .connection-indicator.disconnected {
          background: #f44336;
        }

        @keyframes blink {
          50% {
            opacity: 0.5;
          }
        }

        .latency-indicator {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          margin-left: 8px;
        }

        .latency-low {
          background: #4caf50;
          color: white;
        }
        .latency-medium {
          background: #ff9800;
          color: white;
        }
        .latency-high {
          background: #f44336;
          color: white;
        }
      `]}static async getConfigElement(){return document.createElement("voice-receiving-card-editor")}static getStubConfig(){return{type:"custom:voice-receiving-card",title:"Voice Receiver",auto_play:!0}}setConfig(t){if(!t)throw new Error("Invalid configuration");this.config=t,this.webrtc&&this.webrtc.updateConfig({serverUrl:this.config.server_url})}getCardSize(){return 4}connectedCallback(){super.connectedCallback(),this.webrtc=new l({serverUrl:this.config?.server_url}),this.webrtc.addEventListener("state-changed",t=>{this.status=t.detail.state,t.detail.error?(this.errorMessage=t.detail.error,"error"===this.status&&(this.isWatching=!1,this.isActive=!1)):this.errorMessage="","connected"===this.status&&this.isWatching,this.requestUpdate()}),this.webrtc.addEventListener("streams-changed",t=>{if(this.availableStreams=t.detail.streams||[],this.isWatching&&this.availableStreams.length>0){const t=this.availableStreams[this.availableStreams.length-1];this.selectedStream!==t&&this.selectStream(t)}}),this.webrtc.addEventListener("stream-added",t=>{this.availableStreams.includes(t.detail.streamId)||(this.availableStreams=[...this.availableStreams,t.detail.streamId]),this.isWatching&&(this.isActive?(this.stopReceiving(),setTimeout(()=>this.selectStream(t.detail.streamId),200)):this.selectStream(t.detail.streamId))}),this.webrtc.addEventListener("stream-removed",t=>{this.availableStreams=this.availableStreams.filter(e=>e!==t.detail.streamId),this.selectedStream===t.detail.streamId&&(this.selectedStream=null,this.stopReceiving(),this.isWatching)}),this.webrtc.addEventListener("track",t=>{if(this.audioElement&&t.detail.stream){const e=t.detail.stream;this.audioElement.srcObject=e,this.audioElement.play().then(()=>{this.isActive=!0,this.startVisualization()}).catch(t=>{console.error("[VoiceReceiver] ❌ Audio playback failed:",t),"NotAllowedError"===t.name&&(console.warn("[VoiceReceiver] Autoplay blocked. User interaction required."),this.errorMessage="Click anywhere to enable audio")})}else console.error("[VoiceReceiver] Track event missing audio element or stream")}),this.webrtc.addEventListener("audio-data",t=>{"connected"!==this.status&&(this.status="connected",this.errorMessage="",this.requestUpdate()),t.detail.timestamp&&(this.latency=Date.now()-1e3*t.detail.timestamp)})}disconnectedCallback(){super.disconnectedCallback(),this.stopAll(),this.webrtc?.stop()}selectStream(t){(this.selectedStream!==t||!this.isActive&&"connecting"!==this.status)&&(this.selectedStream=t,this.webrtc?.startReceiving(t))}stopReceiving(){this.isWatching?this.webrtc?.stopStream():this.webrtc?.stop(),this.stopVisualization(),this.isActive=!1,this.isWatching||(this.selectedStream=null)}startVisualization(){if(!this.canvas||!this.webrtc)return;const t=this.canvas.getContext("2d");if(!t)return;const e=()=>{const i=this.webrtc?.getAnalyser();if(!i)return void(this.animationFrame=requestAnimationFrame(e));const s=i.frequencyBinCount,a=new Uint8Array(s);i.getByteFrequencyData(a),t.fillStyle="rgba(240, 240, 240, 0.3)",t.fillRect(0,0,this.canvas.width,this.canvas.height);const r=this.canvas.width/s*2.5;let n,o=0;for(let e=0;e<s;e++)n=a[e]/255*this.canvas.height,t.fillStyle=`hsl(${e/s*360}, 100%, 50%)`,t.fillRect(o,this.canvas.height-n/2,r,n),o+=r+1;this.animationFrame=requestAnimationFrame(e)};e()}stopVisualization(){this.animationFrame&&(cancelAnimationFrame(this.animationFrame),this.animationFrame=null)}async startAutoListen(){this.isWatching=!0,this.errorMessage="";try{"connected"!==this.status&&await(this.webrtc?.startReceiving())}catch(t){return console.error("[AutoListen] Connection failed:",t),this.errorMessage=t.message||"Connection failed",this.isWatching=!1,void this.requestUpdate()}this.watchInterval&&clearInterval(this.watchInterval),this.watchInterval=setInterval(()=>{this.isWatching&&this.webrtc&&this.webrtc.getStreams()},h.STREAM_CHECK_INTERVAL),this.webrtc?.getStreams(),setTimeout(()=>{this.isWatching&&this.webrtc&&this.webrtc.getStreams()},500)}stopAll(){this.isWatching=!1,this.selectedStream=null,this.watchInterval&&(clearInterval(this.watchInterval),this.watchInterval=null),this.stopReceiving()}manualSelectStream(t){this.isWatching=!1,this.selectStream(t)}getLatencyClass(){return this.latency<g.LOW?"latency-low":this.latency<g.MEDIUM?"latency-medium":"latency-high"}getStatusText(){return this.isActive?`Playing: ${this.selectedStream?this.selectedStream.substring(0,8):"Unknown"}`:this.isWatching?"Watching for streams...":this.status}render(){return this.config?n`
      <ha-card>
        <div class="header">
          <div class="title">${this.config.title||this.config.name||"Voice Receive"}</div>
          <div class="status-badge ${this.status}">${this.status}</div>
        </div>

        <div class="content">
          <div class="controls">
            ${this.isActive||this.isWatching?n`<button class="action-button stop" @click=${this.stopAll}><span>⏹</span> Stop Listening</button>`:n`<button class="action-button start" @click=${this.startAutoListen}><span>👂</span> Auto Listen</button>`}
          </div>

          <div class="status">
            <div>
              <span class="connection-indicator ${this.status}" id="connectionIndicator"></span>
              <span>${this.getStatusText()}</span>
            </div>
            ${this.isActive?n`
                  <div style="margin-top: 4px;">
                    <span class="latency-indicator ${this.getLatencyClass()}">Latency: ${this.latency}ms</span>
                  </div>
                `:""}
          </div>

          <div class="visualization">
            <canvas width="300" height="80"></canvas>
          </div>

          <div class="stream-list">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; padding: 0 12px;">Available Streams (${this.availableStreams.length})</h3>
            ${this.availableStreams.length>0?this.availableStreams.map(t=>n`
                    <div class="stream-item ${this.selectedStream===t?"active":""}" @click=${()=>this.manualSelectStream(t)}>
                      <span>Stream: ${t.substring(0,8)}...</span>
                      ${this.selectedStream===t?n`<span>🔊 Playing</span>`:""}
                    </div>
                  `):n`<div style="padding: 12px; font-size: 12px; color: #666;">No streams detected</div>`}
          </div>

          <audio autoplay style="display: none"></audio>
          ${this.errorMessage?n`<div class="error-message">${this.errorMessage}</div>`:""}
        </div>
      </ha-card>
    `:n``}};e([i({attribute:!1})],u.prototype,"hass",void 0),e([s()],u.prototype,"config",void 0),e([s()],u.prototype,"status",void 0),e([s()],u.prototype,"errorMessage",void 0),e([s()],u.prototype,"latency",void 0),e([s()],u.prototype,"availableStreams",void 0),e([s()],u.prototype,"selectedStream",void 0),e([s()],u.prototype,"isWatching",void 0),e([s()],u.prototype,"isActive",void 0),e([o("canvas")],u.prototype,"canvas",void 0),e([o("audio")],u.prototype,"audioElement",void 0),u=e([a("voice-receiving-card")],u),window.customCards=window.customCards||[],window.customCards.push({type:"voice-receiving-card",name:"Voice Receiving Card",description:"Receive voice audio via WebRTC",preview:!0,editor:"voice-receiving-card-editor",version:"1.2.0"});export{u as VoiceReceivingCard};
//# sourceMappingURL=voice-receiving-card.js.map
