<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup">
            <p class="message">
                <template v-if="itemType === 'post'">
                    {{ $t('date.changePostPublicationDate') }}:
                </template>
                <template v-else-if="itemType === 'page'">
                    {{ $t('date.changePagePublicationDate') }}:  
                </template>
            </p>

            <div class="item-date-picker">
                <input
                    type="date"
                    v-model="itemDateTime.date" />
                <input 
                    type="time"
                    v-model="itemDateTime.time" />
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
    props: [
        'itemType'
    ],
    data () {
        return {
            isVisible: false,
            timestamp: 0,
            itemDateTime: {
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

            this.itemDateTime.date = [year, month, day].map(n => n < 10 ? '0' + n : n).join('-');
            this.itemDateTime.time = [hours, minutes].map(n => n < 10 ? '0' + n : n).join(':');
        },
        calculateTimestampFromTime () {
            this.timestamp = new Date(this.itemDateTime.date + ' ' + this.itemDateTime.time).getTime();
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
    font-size: 1.6rem;
    padding: 0 0 4rem 0;
}

.buttons {
    display: flex;
    margin: 4rem -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}

.item-date-picker {
    display: flex;
    justify-content: space-between;
    margin-top: -1rem;
    text-align: center;
    white-space: nowrap;

    input[type="date"],
    input[type="time"] {
        background: none;
        border-radius: 3px;
        border: none;
        box-shadow: inset 0 0 0 1px var(--input-border-color);
        color: var(--text-primary-color); 
        color-scheme: var(--input-data-time-popup);
        font-size: 2.1rem;
        font-weight: var(--font-weight-normal);
        min-height: 46px;
        min-width: 48%;
        padding: .45rem 1.2rem;

        &:focus {
          box-shadow: inset 0 0 2px 1px var(--input-border-focus);
        }

        &::-webkit-datetime-edit-fields-wrapper {
            background: transparent; 
        }

        &::-webkit-datetime-edit-text {
            color: var(--text-primary-color); 
            padding: 0 .2em;
        }

        &::-webkit-calendar-picker-indicator {
            cursor: pointer;
        }

        &::-webkit-datetime-edit-month-field,
        &::-webkit-datetime-edit-day-field,
        &::-webkit-datetime-edit-year-field,
        &::-webkit-datetime-edit-hour-field,
        &::-webkit-datetime-edit-minute-field { 
            cursor: text; 
        }

        &::-webkit-calendar-picker-indicator {
            background-size: 22px;
            background-position-y: 50%;
              
        }
    }
}
</style>
