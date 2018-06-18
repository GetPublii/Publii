<template>
    <div :class="{ 'small-image-upload': true, 'is-uploading': isUploading }">
        <span class="upload-path">
            <template v-if="!isUploading">{{ fileName }}</template>
            <template v-if="isUploading">Loading image...</template>
        </span>

        <input
            v-if="isEmpty"
            type="file"
            ref="input"
            class="upload-input"
            @change="valueChanged">

        <a
            v-if="!isEmpty"
            href="#"
            class="upload-remove"
            title="Remove image"
            @click="remove">
            &times;
        </a>
    </div>
</template>

<script>
import normalizePath from 'normalize-path';
import { ipcRenderer } from 'electron';
import PreloaderImages from './../configs/preloaderImages';

export default {
    name: 'small-image-upload',
    props: {
        value: {
            default: '',
            type: String
        },
        onRemove: {
            default: () => false,
            type: Function
        }
    },
    data () {
        return {
            isEmpty: true,
            fileName: '',
            isUploading: false
        }
    },
    watch: {
        value (newValue, oldValue) {
            if (newValue !== '') {
                this.fileName = newValue;
                this.isEmpty = false;
            }
        },
        fileName: function(newValue) {
            if (newValue === '') {
                this.$emit('input', '');
            } else {
                this.$emit('input', newValue);
            }
        }
    },
    mounted () {
        setTimeout(() => {
            if (this.value !== '') {
                this.filePath = this.value;
                this.isEmpty = false;
            }
        }, 0);
    },
    methods: {
        remove (e) {
            e.preventDefault();
            this.fileName = '';
            this.isEmpty = true;
            this.onRemove();
        },
        valueChanged (e) {
            if(!e.target.files.length) {
                return;
            }

            let sourcePath = e.target.files[0].path;
            this.uploadImage(sourcePath);
        },
        uploadImage (sourcePath) {
            this.isUploading = true;

            let uploadData = {
                id: 'website',
                site: this.$store.state.currentSite.config.name,
                path: sourcePath,
                imageType: 'optionImages'
            };

            ipcRenderer.send('app-image-upload', uploadData);

            ipcRenderer.once('app-image-uploaded', (event, data) => {
                this.isEmpty = false;
                this.fileName = 'media/website/' + normalizePath(data.baseImage.newPath).split('/').pop();
                this.isUploading = false;
            });
        },
        setImage (newFileName) {
            this.fileName = newFileName;
            this.isEmpty = newFileName === '';
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.small-image-upload {
    min-height: 48px;
    position: relative;

    &.is-uploading {
        opacity: .85;
        pointer-events: none;
    }

    .upload-remove {
        color: $color-3;
        cursor: pointer;
        font-size: 2.4rem;
        font-weight: 300;
        height: 2rem;
        line-height: 1.9rem;
        position: absolute;
        right: 1.5rem;
        text-align: center;
        top: 1.4rem;
        transition: all .3s ease-out;
        width: 2rem;

        &:hover {
            color: $color-4;
        }
    }

    .upload-input {
        display: block;
        position: absolute;
        right: .55rem;
        top: .55rem;
        width: 16rem!important;

        &::-webkit-file-upload-button {
            -webkit-appearance: none;
            background: $color-7;
            border: 1px solid $color-7;
            border-radius: 3px;
            color: $color-10;
            font-weight: bold;
            padding: .5rem;
            text-align: center;
            width: 16rem;

            &:hover {
                background: $color-6;
                border-color: $color-6;
            }
        }
    }
}
</style>
