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
    border-top: 1px solid rgba($color-8, 0.2);
    border-radius: 4px;
    cursor: pointer;   
    display: flex; 
    flex-direction: row-reverse;
    margin: 0 2rem;
    padding: 0.9rem 0 0.9rem 1rem;    

    &:first-child {
        border-top: none;
    }
   
    &-icon {
        align-items: center;
        background: $color-10;
        border-radius: 3px;
        display: flex;
        height: 3.3rem;
        justify-content: center;
        position: relative;
        transition: all .25s ease-out;
        will-change: transform;
        width: 3.3rem;  

        @include logoColors();

    }

    &:hover {      
        background: linear-gradient(to left, rgba(255,255,255,0) 0%,$color-9 100%); 
       
        .single-site-icon {
            transform: scale(1.1);
        }
        
        .single-site-name {
            color: $color-4;
           
        }
    }

    &-name {
        display: block;
        font-size: 1.5rem;
        font-weight: 400;
        line-height: 3.6rem;
        margin: 0 1.6rem 0 0;
        overflow: hidden;
        padding: 0;
        text-align: left;
        text-overflow: ellipsis; 
        transition: all .25s ease-out;
        white-space: nowrap;
        width: 80%;
    }
}
</style>


