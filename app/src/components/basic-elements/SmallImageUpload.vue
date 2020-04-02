<template>
    <div 
        :id="anchor"
        :class="{ 'small-image-upload': true, 'is-uploading': isUploading }">
        <span class="upload-path">
            <template v-if="!isUploading">{{ fileName }}</template>
            <template v-if="isUploading">Loading image...</template>
        </span>

        <input
            v-if="isEmpty"
            type="file"
            ref="input"
            spellcheck="false"
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
        },
        anchor: {
            default: '',
            type: String
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
        border-radius: 50%;
        color: var(--warning);
        cursor: pointer;
        font-size: 2.4rem;
        font-weight: 300;
        height: 3rem;                   
        line-height: 1.1; 
        padding: 0;
        position: absolute;
        right: 1.5rem;
        text-align: center; 
        top: 50%;  
        transition: var(--transition);   
        transform: translateY(-50%);             
        width: 3rem;
                                
        &:active,
        &:focus,
        &:hover {
            color: var(--icon-tertiary-color);
        }
        
        &:hover {
            background: var(--input-border-color);
        }  
    }

    .upload-input {
        display: block;
        position: absolute;
        right: .7rem;
        top: .7rem;
        width: 16rem!important;

        &::-webkit-file-upload-button {
            -webkit-appearance: none;
            background: var(--button-gray-bg);
            border: 1px solid var(--button-gray-bg);
            border-radius: 3px;
            color: var(--white);
            cursor: pointer;
            font-weight: 500;
            font-size: 1.5rem;
            padding: .5rem;
            text-align: center;
            width: 16rem;
            outline: none;

            &:hover {
               background: var(--button-gray-hover-bg);
               border-color: var(--button-gray-hover-bg);
            }
        }
    }
}
</style>
