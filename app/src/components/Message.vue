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
                }, this.lifeTime * 1000);
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
     top: 2.2rem;
     transform: translate(-50%, 0);
     width: 46rem;
     z-index: 100003;

     .message {
         animation: messages-animation .3s cubic-bezier(0,.68,.38,.98) forwards;
         margin: 0;
         opacity: 1;
         padding: 0;
         position: relative;
         width: 100%;

         @at-root {
                  @keyframes messages-animation {
                     from {
                          opacity: 0;
                          transform: scale(0.5);
                     }
                     to {
                          opacity: 1;
                          transform: scale(1);
                     }
                 }
            }

         &-content {
             align-items: center;
             background: $color-10;
             box-shadow: 0 0.2rem 0.4rem rgba(0, 0, 0, 0.2);
             border-radius: 0 0 .6rem .6rem;
             color: $color-5;
             font-size: 1.6rem;
             font-weight: 500;
             display: flex;
             justify-content: center;
             margin: 0;
             padding: 3rem 1rem;
             pointer-events: all;
             position: absolute;
             width: 46rem;

             a {
                 color: $color-10;
                 cursor: pointer;
                 text-decoration: underline;

                 &:active,
                 &:focus,
                 &:hover {
                     opacity: .75;
                 }
             }

             p {
                 margin: 0 0 0 3rem;
                 width: 75%;
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
        top: 3.6rem;
    }
}

body[data-os="linux"] {
    .messages {
        top: 2.4rem;
    }
}
</style>
