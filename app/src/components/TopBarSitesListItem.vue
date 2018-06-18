<template>
    <li
        class="single-site"
        @click="showWebsite(site)">
        <span class="single-site-icon" :data-color="siteLogoColor">
            <icon
                :name="siteLogoIcon"
                primaryColor="color-10"
                customHeight="18"
                customWidth="18" />
        </span>

        <strong class="single-site-name">
            {{ displayName }}
        </strong>
    </li>
</template>

<script>
import { mapState } from 'vuex'

export default {
    name: 'topbar-sites-list-item',
    props: [
        'site'
    ],
    computed: {
        displayName: function() {
            return this.$store.state.sites[this.site].displayName;
        },
        siteLogoIcon: function() {
            return this.$store.state.sites[this.site].logo.icon;
        },
        siteLogoColor: function() {
            return this.$store.state.sites[this.site].logo.color;
        }
    },
    methods: {
        showWebsite: function(siteToDisplay) {
            window.localStorage.setItem('publii-last-opened-website', siteToDisplay);
            this.$router.push({ path: `/site/${siteToDisplay}` });
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/mixins.scss';

/*
 * Single site
 */
.single-site {
    align-items: center;
    background: $color-10;
    border-top: 1px solid rgba($color-8, 0.4);
    cursor: pointer;
    display: flex;
    margin: 0;
    padding: 0.9rem 2rem;
    width: 100%;

    &:first-child {
        border-top: none;
    }

    &-icon {
        align-items: center;
        background: $color-10;
        border-radius: 50%;
        display: flex;
        height: 3.5rem;
        justify-content: center;
        position: relative;
        transition: all .25s ease-out;
        width: 3.5rem;

        @include logoColors();

    }

    &:hover {
        background: $color-9;

        .single-site-icon {
            transform: scale(1.1);
        }
    }

    &-name {
        display: block;
        font-size: 1.5rem;
        font-weight: 600;
        line-height: 3.9rem;
        margin: 0 0 0 1.6rem;
        overflow: hidden;
        padding: 0;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 80%;
    }
}
</style>
