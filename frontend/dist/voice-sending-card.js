import{i as e,_ as t,n as i,r as a,a as s,b as n,t as o,e as r,s as c,W as l}from"./styles-Bq46uLpA.js";let d=class extends s{setConfig(e){this._config=e}_valueChanged(e){if(!this._config||!this.hass)return;const t=e.target,i=t.configValue;if(!i)return;const a=void 0!==t.checked?t.checked:t.value;if(this._config[i]===a)return;const s={...this._config};""===a&&void 0===t.checked?delete s[i]:s[i]=a,this._config=s,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}render(){return this.hass&&this._config?n`
      <div class="card-config">
        <ha-textfield label="Title" .value=${this._config.title||""} .configValue=${"title"} @input=${this._valueChanged}></ha-textfield>
        <ha-textfield
          label="Server URL (optional)"
          .value=${this._config.server_url||""}
          .configValue=${"server_url"}
          helper="WebRTC Server (WS) e.g. localhost:8080/ws"
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-formfield label="UDP Mode (Low Latency - ESPHome)">
          <ha-switch .checked=${!0===this._config.udp_mode} .configValue=${"udp_mode"} @change=${this._valueChanged}></ha-switch>
        </ha-formfield>
        ${this._config.udp_mode?n`
          <ha-textfield
            label="UDP Target IP (ESP32 IP)"
            .value=${this._config.udp_target_ip||""}
            .configValue=${"udp_target_ip"}
            helper="IP address of the ESP32 device e.g. 192.168.1.100"
            @input=${this._valueChanged}
          ></ha-textfield>
          <ha-textfield
            label="UDP Target Port"
            type="number"
            .value=${this._config.udp_target_port||28256}
            .configValue=${"udp_target_port"}
            helper="UDP port (default: 28256)"
            @input=${this._valueChanged}
          ></ha-textfield>
        `:n`
          <ha-textfield
            label="Audio Stream URL (optional)"
            .value=${this._config.stream_url||""}
            .configValue=${"stream_url"}
            helper="Audio playback URL e.g. http://192.168.1.10:8081/stream/latest.mp3"
            @input=${this._valueChanged}
          ></ha-textfield>
          <ha-textfield
            label="Target Media Player (optional)"
            .value=${this._config.target_media_player||""}
            .configValue=${"target_media_player"}
            helper="Entity ID e.g. media_player.living_room_speaker"
            @input=${this._valueChanged}
          ></ha-textfield>
        `}
        <div class="side-by-side">
          <ha-formfield label="Auto Start">
            <ha-switch .checked=${!1!==this._config.auto_start} .configValue=${"auto_start"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
          <ha-formfield label="Noise Suppression">
            <ha-switch .checked=${!1!==this._config.noise_suppression} .configValue=${"noise_suppression"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
        </div>
        <div class="side-by-side">
          <ha-formfield label="Echo Cancellation">
            <ha-switch .checked=${!1!==this._config.echo_cancellation} .configValue=${"echo_cancellation"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
          <ha-formfield label="Auto Gain Control">
            <ha-switch .checked=${!1!==this._config.auto_gain_control} .configValue=${"auto_gain_control"} @change=${this._valueChanged}></ha-switch>
          </ha-formfield>
        </div>
      </div>
    `:n``}};d.styles=e`
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
  `,t([i({attribute:!1})],d.prototype,"hass",void 0),t([a()],d.prototype,"_config",void 0),d=t([o("voice-sending-card-editor")],d);let h=class extends s{constructor(){super(...arguments),this.status="disconnected",this.errorMessage="",this.latency=0,this.webrtc=null,this.animationFrame=null}static get styles(){return[c,e`
        /* Add specific styles if needed */
      `]}static async getConfigElement(){return document.createElement("voice-sending-card-editor")}static getStubConfig(){return{type:"custom:voice-sending-card",title:"Voice Sender",auto_start:!1,noise_suppression:!0,echo_cancellation:!0,auto_gain_control:!0}}setConfig(e){if(!e)throw new Error("Invalid configuration");this.config=e,this.webrtc&&this.webrtc.updateConfig({serverUrl:this.config.server_url,noiseSuppression:this.config.noise_suppression,echoCancellation:this.config.echo_cancellation,autoGainControl:this.config.auto_gain_control,udpMode:this.config.udp_mode,udpTargetIp:this.config.udp_target_ip,udpTargetPort:this.config.udp_target_port})}getCardSize(){return 3}connectedCallback(){super.connectedCallback(),this.webrtc||(this.webrtc=new l({serverUrl:this.config?.server_url,noiseSuppression:this.config?.noise_suppression,echoCancellation:this.config?.echo_cancellation,autoGainControl:this.config?.auto_gain_control,udpMode:this.config?.udp_mode,udpTargetIp:this.config?.udp_target_ip,udpTargetPort:this.config?.udp_target_port})),this.webrtc.addEventListener("state-changed",e=>{this.status=e.detail.state,e.detail.error?this.errorMessage=e.detail.error:this.errorMessage="",this.requestUpdate()}),this.webrtc.addEventListener("audio-data",e=>{e.detail.timestamp&&(this.latency=Date.now()-1e3*e.detail.timestamp)}),!0===this.config?.auto_start&&this.toggleSending()}disconnectedCallback(){super.disconnectedCallback(),this.stopVisualization(),this.webrtc?.stop()}async toggleSending(){"connected"===this.status||"connecting"===this.status?(this.webrtc?.stop(),this.stopVisualization(),this.config.udp_mode||await this.manageMediaPlayer("stop")):(await(this.webrtc?.startSending()),this.startVisualization(),this.config.udp_mode||await this.manageMediaPlayer("play"))}async manageMediaPlayer(e){if(this.config.target_media_player&&this.hass)try{if("play"===e){if(!this.config.stream_url)return void console.warn("No stream_url configured for media player playback");const e=this.config.stream_url;await this.hass.callService("media_player","play_media",{entity_id:this.config.target_media_player,media_content_id:e,media_content_type:"music"})}else await this.hass.callService("media_player","media_stop",{entity_id:this.config.target_media_player})}catch(e){console.error("Failed to control media player:",e),this.errorMessage=`Media Player Error: ${e.message}`}}startVisualization(){if(!this.canvas||!this.webrtc)return;const e=this.canvas.getContext("2d");if(!e)return;const t=()=>{const i=this.webrtc?.getAnalyser();if(!i)return void(this.animationFrame=requestAnimationFrame(t));const a=i.frequencyBinCount,s=new Uint8Array(a);i.getByteFrequencyData(s),e.fillStyle="rgb(240, 240, 240)",e.fillRect(0,0,this.canvas.width,this.canvas.height);const n=this.canvas.width/a*2.5;let o,r=0;for(let t=0;t<a;t++)o=s[t]/255*this.canvas.height,e.fillStyle=`rgb(${o+100}, 50, 50)`,e.fillRect(r,this.canvas.height-o/2,n,o),r+=n+1;this.animationFrame=requestAnimationFrame(t)};t()}stopVisualization(){this.animationFrame&&(cancelAnimationFrame(this.animationFrame),this.animationFrame=null)}render(){if(!this.config)return n``;const e="connected"===this.status,t=e?"🛑":"🎤";return this.errorMessage||this.status,n`
      <ha-card>
        <div class="header">
          <div class="title">${this.config.title||this.config.name||"Voice Send"}</div>
          <div class="status-badge ${this.status}">${this.status}</div>
        </div>

        <div class="content">
          <div class="visualization">
            <canvas width="300" height="64"></canvas>
          </div>

          <div class="controls">
            <button
              class="main-button ${e?"active":""} ${"error"===this.status?"error":""}"
              @click=${this.toggleSending}
              ?disabled=${"connecting"===this.status}
            >
              ${t}
            </button>
          </div>

          <div class="stats">${e?n`<span>Latency: ${this.latency}ms</span>`:""}</div>

          ${this.errorMessage?n`<div class="error-message">${this.errorMessage}</div>`:""}
        </div>
      </ha-card>
    `}};t([i({attribute:!1})],h.prototype,"hass",void 0),t([a()],h.prototype,"config",void 0),t([a()],h.prototype,"status",void 0),t([a()],h.prototype,"errorMessage",void 0),t([a()],h.prototype,"latency",void 0),t([r("canvas")],h.prototype,"canvas",void 0),h=t([o("voice-sending-card")],h),window.customCards=window.customCards||[],window.customCards.push({type:"voice-sending-card",name:"Voice Sending Card",description:"Send voice audio via WebRTC",preview:!0,editor:"voice-sending-card-editor",version:"1.2.0"});export{h as VoiceSendingCard};
//# sourceMappingURL=voice-sending-card.js.map
