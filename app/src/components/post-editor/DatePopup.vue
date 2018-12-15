<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup">
            <p class="message">
                Change post publication date:
            </p>

            <div class="post-date-picker">
                <select
                    v-model="time.month"
                    class="post-date-editor-month">
                    <option value="1">Jan</option>
                    <option value="2">Feb</option>
                    <option value="3">Mar</option>
                    <option value="4">Apr</option>
                    <option value="5">May</option>
                    <option value="6">Jun</option>
                    <option value="7">Jul</option>
                    <option value="8">Aug</option>
                    <option value="9">Sep</option>
                    <option value="10">Oct</option>
                    <option value="11">Nov</option>
                    <option value="12">Dec</option>
                </select>/

                <select
                    v-model="time.day"
                    class="post-date-editor-day">
                    <option value="1">01</option>
                    <option value="2">02</option>
                    <option value="3">03</option>
                    <option value="4">04</option>
                    <option value="5">05</option>
                    <option value="6">06</option>
                    <option value="7">07</option>
                    <option value="8">08</option>
                    <option value="9">09</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13">13</option>
                    <option value="14">14</option>
                    <option value="15">15</option>
                    <option value="16">16</option>
                    <option value="17">17</option>
                    <option value="18">18</option>
                    <option value="19">19</option>
                    <option value="20">20</option>
                    <option value="21">21</option>
                    <option value="22">22</option>
                    <option value="23">23</option>
                    <option value="24">24</option>
                    <option value="25">25</option>
                    <option value="26">26</option>
                    <option value="27">27</option>
                    <option value="28">28</option>
                    <option value="29">29</option>
                    <option value="30">30</option>
                    <option value="31">31</option>
                </select>/

                <input
                    v-model="time.year"
                    type="number"
                    class="post-date-editor-year"
                    step="1">

                <select
                    v-model="time.hours"
                    class="post-date-editor-hours">
                    <option value="0">00</option>
                    <option value="1">01</option>
                    <option value="2">02</option>
                    <option value="3">03</option>
                    <option value="4">04</option>
                    <option value="5">05</option>
                    <option value="6">06</option>
                    <option value="7">07</option>
                    <option value="8">08</option>
                    <option value="9">09</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13" v-if="format24isActive">13</option>
                    <option value="14" v-if="format24isActive">14</option>
                    <option value="15" v-if="format24isActive">15</option>
                    <option value="16" v-if="format24isActive">16</option>
                    <option value="17" v-if="format24isActive">17</option>
                    <option value="18" v-if="format24isActive">18</option>
                    <option value="19" v-if="format24isActive">19</option>
                    <option value="20" v-if="format24isActive">20</option>
                    <option value="21" v-if="format24isActive">21</option>
                    <option value="22" v-if="format24isActive">22</option>
                    <option value="23" v-if="format24isActive">23</option>
                </select>

                :<select
                    v-model="time.minutes"
                    class="post-date-editor-minutes">
                    <option value="0">00</option>
                    <option value="1">01</option>
                    <option value="2">02</option>
                    <option value="3">03</option>
                    <option value="4">04</option>
                    <option value="5">05</option>
                    <option value="6">06</option>
                    <option value="7">07</option>
                    <option value="8">08</option>
                    <option value="9">09</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13">13</option>
                    <option value="14">14</option>
                    <option value="15">15</option>
                    <option value="16">16</option>
                    <option value="17">17</option>
                    <option value="18">18</option>
                    <option value="19">19</option>
                    <option value="20">20</option>
                    <option value="21">21</option>
                    <option value="22">22</option>
                    <option value="23">23</option>
                    <option value="24">24</option>
                    <option value="25">25</option>
                    <option value="26">26</option>
                    <option value="27">27</option>
                    <option value="28">28</option>
                    <option value="29">29</option>
                    <option value="30">30</option>
                    <option value="31">31</option>
                    <option value="32">32</option>
                    <option value="33">33</option>
                    <option value="34">34</option>
                    <option value="35">35</option>
                    <option value="36">36</option>
                    <option value="37">37</option>
                    <option value="38">38</option>
                    <option value="39">39</option>
                    <option value="40">40</option>
                    <option value="41">41</option>
                    <option value="42">42</option>
                    <option value="43">43</option>
                    <option value="44">44</option>
                    <option value="45">45</option>
                    <option value="46">46</option>
                    <option value="47">47</option>
                    <option value="48">48</option>
                    <option value="49">49</option>
                    <option value="50">50</option>
                    <option value="51">51</option>
                    <option value="52">52</option>
                    <option value="53">53</option>
                    <option value="54">54</option>
                    <option value="55">55</option>
                    <option value="56">56</option>
                    <option value="57">57</option>
                    <option value="58">58</option>
                    <option value="59">59</option>
                </select>

                <select
                    v-if="!format24isActive"
                    v-model="time.ampm"
                    class="post-date-editor-ampm">
                    <option value="am">AM</option>
                    <option value="pm">PM</option>
                </select>
            </div>

            <div class="buttons">
                <p-button
                    type="medium no-border-radius half-width"
                    @click.native="changeDate">
                    OK
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
                    @click.native="cancel">
                    Cancel
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
            time: {
                month: 1,
                day: 1,
                year: 2016,
                hours: 0,
                minutes: 0,
                ampm: 'am'
            }
        };
    },
    computed: {
        format24isActive () {
            return this.$store.state.app.config.timeFormat == 24;
        }
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
            this.time.month = date.getMonth() + 1;
            this.time.day = date.getDate();
            this.time.year = date.getFullYear();
            this.time.hours = date.getHours();
            this.time.minutes = date.getMinutes();

            if (!this.format24isActive) {
                this.time.ampm = this.time.hours >= 12 ? 'pm' : 'am';
                this.time.hours = this.time.hours % 12;
            }
        },
        calculateTimestampFromTime () {
            this.timestamp = new Date(
                this.time.year,
                this.time.month -1,
                this.time.day,
                this.time.ampm === 'pm' ? this.time.hours + 12 : this.time.hours,
                this.time.minutes
            ).getTime();
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
    background-color: $color-10;
    border: none;
    border-radius: .6rem;
    display: inline-block;
    font-size: 1.6rem;
    font-weight: 400;
    left: 50%;
    max-width: 60rem;
    min-width: 60rem;
    overflow: hidden;
    padding: 4rem;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
}

.message {
    color: $color-7;
    font-size: 1.8rem;
    font-weight: 400;
    margin: 0;
    padding: 0 0 4rem 0;
    position: relative;
    text-align: center;

    &.text-centered {
        text-align: center;
    }
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
        background: $color-10 url('data:image/svg+xml;utf8,<svg fill="%238e929d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><polygon points="10 0 5 0 0 0 5 6 10 0"/></svg>') no-repeat 100% 50%;
        background-size: 10px;
        border: none;
        box-shadow: none;
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
