<template>
    <div class="overlay" v-if="isVisible">
        <div class="popup">
            <p
                :class="cssClasses"
                v-pure-html="message">
            </p>

            <div class="buttons">
                <p-button
                    :intent="buttonIntent"
                    size="medium"
                    width="full"
                    square
                    :onClick="onOk">
                    {{ buttonText }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'alert',
    data: function() {
        return {
            isVisible: false,
            requestId: '',
            displaySequence: 0,
            textCentered: false,
            message: '',
            buttonStyle: 'normal',
            buttonText: this.$t('ui.ok'),
            okClick: () => false
        };
    },
    computed: {
        cssClasses: function() {
            return {
                'message': true,
                'text-centered': this.textCentered
            };
        },
        buttonIntent: function() {
            if(this.buttonStyle === 'danger') {
                return 'danger';
            }

            if(this.buttonStyle === 'success') {
                return 'primary';
            }

            return 'default';
        }
    },
    mounted: function() {
        this.$bus.$on('alert-display', (config) => {
            const sequence = ++this.displaySequence;
            this.requestId = config.requestId || '';
            document.body.classList.add('has-popup-visible');

            setTimeout(() => {
                if (sequence !== this.displaySequence) {
                    return;
                }

                this.isVisible = true;
                this.message = config.message;
                this.textCentered = config.textCentered || false;
                this.buttonStyle = config.buttonStyle || 'normal';

                if (config.okLabel) {
                    this.buttonText = config.okLabel;
                } else {
                    this.buttonText = this.$t('ui.ok');
                }

                if (config.okClick) {
                    this.okClick = config.okClick;
                } else {
                    this.okClick = () => false;
                }
            }, 0);
        });

        this.$bus.$on('alert-dismiss', this.dismissRequest);
        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        dismissRequest (requestId) {
            if (requestId && requestId === this.requestId) {
                this.displaySequence++;
                this.requestId = '';
                this.isVisible = false;
                document.body.classList.remove('has-popup-visible');
            }
        },
        onOk: function() {
            this.displaySequence++;
            this.requestId = '';
            this.isVisible = false;
            document.body.classList.remove('has-popup-visible');
            this.okClick();
        },
        onDocumentKeyDown (e) {
            if (e.code === 'Enter' && !event.isComposing && this.isVisible) {
                this.onEnterKey();
            }
        },
        onEnterKey () {
            this.onOk();
        }
    },
    beforeDestroy () {
        this.$bus.$off('alert-display');
        this.$bus.$off('alert-dismiss', this.dismissRequest);
        document.body.removeEventListener('keydown', this.onDocumentKeyDown);
    }
}
</script>

<style scoped>
@import '../../css/popup-common.css';

.overlay {
    z-index: var(--layer-alert);
}

.popup {
    max-width: 60rem;
    min-width: 40rem;

    p {
        max-height: 400px;
        overflow: auto;
        -webkit-user-select: text;
        user-select: text;
    }
}

.buttons {
    display: flex;
    margin: var(--space-2) 0 0 0;
    position: relative;
    text-align: center;
    top: 1px;
    width: 100%;
}
</style>
