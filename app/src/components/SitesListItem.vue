<template>
    <li
        class="single-site"
        @click="showWebsite(site)">    
        
        <span class="single-site-icon">
            <icon 
                :data-color="siteLogoColor"
                :name="siteLogoIcon"                
                 size="s" />
        </span>
        
        <strong class="single-site-name" :title="displayName">
            {{ displayName }}
        </strong>        
        
    </li>
</template>

<script>
import { mapState } from 'vuex'

export default {
    name: 'sites-list-item',
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
            this.$bus.$emit('site-switched');
            this.$bus.$emit('sites-popup-hide');
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
    background: var(--bg-secondary);     
    cursor: pointer;   
    display: flex;    
    margin: 0;
    padding: 0.55rem 2rem;    
   
    &-icon {
        align-items: center;       
        border-radius: 3px;
        display: flex;
        height: auto;
        justify-content: center;
        margin-right: 0.8rem;
        position: relative;
        transition: var(--transition);
        will-change: transform;
        width: 3.3rem;  

        svg {
            @include logoSVGColors();
        }
    }

    &:hover {  
        background: var(--gray-1);
        will-change: transform;       
       
        .single-site-icon {
            transform: scale(1.2);
        }      
    }

    &-name {
        display: block;
        font-size: 1.4rem;
        font-weight: 400;
        line-height: 3.6rem;
        margin: 0;
        overflow: hidden;
        padding: 0;
        text-align: left;
        text-overflow: ellipsis; 
        transition: var(--transition);
        white-space: nowrap;  
        max-width: 82%;        
    }
}
</style>


