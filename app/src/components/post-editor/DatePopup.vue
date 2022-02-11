<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup">
            <p class="message">
                {{ $t('date.changePostPublicationDate') }}:
            </p>

            <div class="post-date-picker">
                <input
                    type="date"
                    v-model="postDateTime.date" />
                <input 
                    type="time"
                    v-model="postDateTime.time" />
            </div>

            <div class="buttons">
                <p-button
                    type="medium no-border-radius half-width"
                    @click.native="changeDate">
                    {{ $t('ui.ok') }}
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
                    @click.native="cancel">
                    {{ $t('ui.cancel') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'date-popup',
    data () {
        return {
            isVisible: false,
            timestamp: 0,
            postDateTime: {
                date: '',
                time: ''
            }
        };
    },
    mounted: function() {
        this.$bus.$on('date-popup-display', timestamp => {
            if (timestamp) {
                this.timestamp = timestamp;
            } else {
                this.timestamp = +new Date();
            }

            this.calculateTimeFromTimestamp();

            setTimeout(() => {
                this.isVisible = true;
            }, 0);
        });
    },
    methods: {
        changeDate () {
            this.calculateTimestampFromTime();
            this.$bus.$emit('date-changed', this.timestamp);
            this.isVisible = false;
        },
        cancel () {
            this.isVisible = false;
        },
        calculateTimeFromTimestamp () {
            let date = new Date(this.timestamp);
            let month = date.getMonth() + 1;
            let day = date.getDate();
            let year = date.getFullYear();
            let hours = date.getHours();
            let minutes = date.getMinutes();

            this.postDateTime.date = [year, month, day].map(n => n < 10 ? '0' + n : n).join('-');
            this.postDateTime.time = [hours, minutes].map(n => n < 10 ? '0' + n : n).join(':');
        },
        calculateTimestampFromTime () {
            this.timestamp = new Date(this.postDateTime.date + ' ' + this.postDateTime.time).getTime();
        }
    },
    beforeDestroy () {
        this.$bus.$off('date-popup-display');
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/popup-common.scss';

.overlay {
    z-index: 100005;
}

.popup {
    max-width: 60rem;
    min-width: 60rem;
    padding: 4rem;
}

.message {
    font-size: 1.8rem;
    padding: 0 0 4rem 0;
}

.buttons {
    display: flex;
    margin: 4rem -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}

.post-date-picker {
    display: block;
    font-size: 2.6rem;
    margin-top: -1rem;
    text-align: center;
    white-space: nowrap;

    select {
        -webkit-appearance: none;
        background: url('data:image/svg+xml;utf8,<svg fill="%238e929d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><polygon points="10 0 5 0 0 0 5 6 10 0"/></svg>') no-repeat 100% 50%;
        background-size: 8px;
        border: none;
        box-shadow: none;
        color: var(--text-primary-color);
        font-size: 2.6rem;
        height: 4.8rem;
        min-width: 70px;
        margin-right: 1rem;
        padding: 0;
        position: relative;
    }

    .post-date-editor-day,
    .post-date-editor-hours,
    .post-date-editor-minutes {
        min-width: 50px;
    }

    .post-date-editor-minutes {
        margin-left: 1.8rem;
    }

    .post-date-editor-year {
        background-color: transparent;
        box-shadow: none;
        font-size: 2.6rem;
        margin-right: 3rem;
        padding: 0;
        width: 80px;
    }

    .post-date-editor-ampm {
        min-width: 60px;
    }
}
</style>
