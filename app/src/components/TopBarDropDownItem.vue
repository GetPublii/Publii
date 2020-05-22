<template>
    <li :title="title">
        <a 
            v-if="!path"
            href="#"
            @click.prevent="onClick">
            {{ label }}
        </a>

        <router-link
            v-if="path && !isExternal"
            :to="path">
            {{ label }}
        </router-link>

        <a
            v-if="path && isExternal"
            :href="path"
            target="_blank">
            {{ label }}
        </a>
    </li>
</template>

<script>
import { shell } from 'electron'

export default {
    name: 'topbar-dropdown-item',
    props: [
        'onClick',
        'label',
        'path',
        'title'
    ],
    computed: {
        isExternal () {
            return this.path.indexOf('http://') === 0 || this.path.indexOf('https://') === 0;
        }
    },
    methods: {
        openExternalLink (e) {
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
        padding: .5rem 3rem;
        white-space: nowrap;
    }
}
</style>
