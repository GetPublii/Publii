<template>
    <li :title="title">
        <router-link
            v-if="!isExternal"
            :to="path">
            {{ label }}
        </router-link>

        <a
            v-if="isExternal"
            :href="path"
            @click="openExternalLink">
            {{ label }}
        </a>
    </li>
</template>

<script>
import { shell } from 'electron'

export default {
    name: 'topbar-dropdown-item',
    props: [
        'label',
        'path',
        'title'
    ],
    computed: {
        isExternal: function() {
            return this.path.indexOf('http://') === 0 || this.path.indexOf('https://') === 0;
        }
    },
    methods: {
        openExternalLink: function(e) {
            e.preventDefault();
            shell.openExternal(this.path);
        }
    }
}
</script>

<style lang="scss" scoped>
li {
    & > a {
        display: block;
        font-weight: 400;
        padding: .5rem 4rem;
    }
}
</style>
