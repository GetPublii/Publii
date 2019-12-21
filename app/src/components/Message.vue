<template>
    <div class="messages">
        <transition>
        <div
            v-if="message"
            class="message">
            <div
                class="message-content"
                @click="onClick"
                :data-type="type">
                <icon
                    size="l"
                    :primaryColor="iconColor"
                    :name="type" />

                <p>{{ message }}</p>
            </div>
        </div>
        </transition>
    </div>
</template>

<script>
export default {
    name: 'message',
    data: function() {
        return {
            timer: false,
            message: '',
            type: 'info',
            clickCallback: false,
            lifeTime: 5
        };
    },
    computed: {
        iconColor: function() {
            if(this.type === 'success') {
                return 'color-2';
            }

            if(this.type === 'warning') {
                return 'color-3';
            }

            return 'color-1';
        }
    },
    mounted: function() {
        this.$bus.$on('message-display', (data) => {
            this.showMessage(data);
        });
    },
    methods: {
        hideMessage: function() {
            clearTimeout(this.timer);
            this.message = '';
        },
        showMessage: function(messageConfig) {
            this.message = messageConfig.message;
            this.type = messageConfig.type;

            if(messageConfig.clickCallback) {
                this.clickCallback = messageConfig.clickCallback;
            }

            if(typeof messageConfig.lifeTime !== 'undefined') {
                this.lifeTime = messageConfig.lifeTime;
            }

            if(this.lifeTime > 0) {
                this.timer = setTimeout(() => {
                    this.hideMessage();
                }, this.lifeTime * 1100);
            }
        },
        onClick: function(e) {
            this.hideMessage();

            if(this.clickCallback !== false) {
                this.clickCallback();
            }
        }
    },
    beforeDestroy () {
        this.$bus.$off('message-display');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

/*
 * Message element
 */

.messages {
     background: transparent;
     bottom: 0;
     pointer-events: none;
     position: absolute;
     left: 50%;
     top: 4.2rem;
     transform: translate(-50%, 0);
     max-width: 48rem;
     width: 100%;
     z-index: 100003;

     .message {
         animation: messages-animation .24s cubic-bezier(.17,.67,.6,1.34) forwards;
         display: flex;
         justify-content: center;
         margin: 0;
         opacity: 1;
         padding: 0;
         position: relative;
         width: 100%;

         @at-root {
                  @keyframes messages-animation {
                     from {
                          opacity: 0;
                          transform: scale(0.6);
                     }
                     to {
                          opacity: 1;
                          transform: scale(1);
                     }
                 }
            }

         &-content {
             align-items: center;
             background: var(--popup-bg);
             box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
             border-radius: 6px;
             color: var(--text-primary-color);
             font-size: 1.5rem;            
             display: flex;
             justify-content: center;  
             line-height: 1.4;
             margin: 0;
             padding: 2rem;
             pointer-events: all;
             position: absolute;
             max-width: 48rem;            

             a {
                 color: var(--white);
                 cursor: pointer;
                 text-decoration: underline;

                 &:active,
                 &:focus,
                 &:hover {
                     opacity: .75;
                 }
             }

             p {
                 margin: 0 0 0 2rem;
             }
             
             .icon {
                 flex-shrink: 0;
             }
         }

         &-icon {
             display: block;            
             margin: 0;
         }
     }
}

body[data-os="win"] {
    .messages {
        top: 5.6rem;
    }
}

body[data-os="linux"] {
    .messages {
        top: 4.4rem;
    }
}
</style>
