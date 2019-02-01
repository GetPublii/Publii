<template>
    <div :class="wrapperCssClasses">
        <div
            :class="inputCssClasses"
            :data-path="filePath"
            :style="backgroundImage"
            @drag="stopEvents"
            @dragstart="stopEvents"
            @dragend="stopEvents"
            @dragover="dragOver"
            @dragenter="stopEvents"
            @dragleave="dragLeave"
            @drop="drop">
            <div class="upload-overlay">
                <icon
                    name="blank-image"
                    customWidth="64"
                    customHeight="64"
                    primaryColor="color-8" />

                {{ labelText }}
                <input
                    ref="input"
                    type="file"
                    class="upload-image-input"
                    @change="valueChanged">

                <div
                    v-if="isUploading"
                    class="upload-uploading-overlay">
                    <div>
                        <div class="loader"><span></span></div>
                        Upload in progress...
                    </div>
                </div>
            </div>
        </div>

        <a
            v-if="!isEmpty"
            href="#"
            class="upload-remove"
            @click="remove">
            Remove image
        </a>
    </div>
</template>

<script>
import normalizePath from 'normalize-path';
import { ipcRenderer } from 'electron';

export default {
    name: 'image-upload',
    props: {
        value: {
            default: '',
            type: String
        },
        type: {
            default: '',
            type: String
        },
        'post-id': {
            type: [String, Number]
        },
        onRemove: {
            default: () => false,
            type: Function
        },
        addMediaFolderPath: {
            default: false,
            type: Boolean
        }
    },
    data () {
        return {          
            isEmpty: true,
            filePath: '',
            isUploading: false,
            isHovered: false
        }
    },
    watch: {
        value (newValue, oldValue) {
            if (newValue !== '') {
                if (newValue.indexOf('https://') === 0 || newValue.indexOf('http://') === 0) {
                    this.filePath = newValue;
                } else {
                    this.filePath = this.mediaPath + newValue;
                }

                this.isEmpty = false;
            }
        },
        filePath: function(newValue) {
            if (newValue === '') {
                this.$emit('input', '');
            } else {
                if (newValue.indexOf('http://') === 0 || newValue.indexOf('https://') === 0) {
                    this.$emit('input', newValue);
                } else {
                    if (this.addMediaFolderPath) {
                        this.$emit('input', 'media/website/' + newValue.split('/').pop());
                    } else {
                        this.$emit('input', newValue.split('/').pop());
                    }
                }
            }
        }
    },
    mounted () {
        setTimeout(() => {
            if (this.value !== '') {
                if (this.value.indexOf('https://') === 0 || this.value.indexOf('http://') === 0) {
                    this.filePath = this.value;
                } else {
                    this.filePath = this.mediaPath + this.value;
                }

                this.isEmpty = false;
            }
        }, 0);
    },
    computed: {
        labelText () {
            let label = 'Drop to upload your photo or';

            if (this.postId || this.postId === 0) {
                label = 'Drop featured image here or';
            }

            return label;
        },
        wrapperCssClasses () {
            return {
                'is-small': this.type.indexOf('small') > -1,
                'upload-image-wrapper': true,
                'is-empty': this.isEmpty
            };
        },
        inputCssClasses () {
            return {
                'upload-image': true,
                'is-empty': this.isEmpty,
                'is-hovered': this.isHovered,
                'is-small': this.type.indexOf('small') > -1
            };
        },
        backgroundImage () {
            if (this.filePath !== '') {
                if (this.filePath.indexOf('https://') === 0 || this.filePath.indexOf('http://') === 0) {
                    return 'background-image: url(\'' + this.filePath + '\');';
                }

                return 'background-image: url(\'file://' + this.filePath + '\');';
            }

            return false;
        },
        mediaPath () {
            if (this.postId) {
                return normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/posts/' + this.postId + '/';
            } else if (this.postId === 0) {
                return normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/posts/temp/';
            }

            if (this.addMediaFolderPath) {
                return normalizePath(this.$store.state.currentSite.siteDir) + '/input/';
            }

            return normalizePath(this.$store.state.currentSite.siteDir) + '/input/media/website/';
        }
    },
    methods: {
        stopEvents (e) {
            e.preventDefault();
            e.stopPropagation();
        },
        dragOver (e) {
            this.stopEvents(e);
            this.isHovered = true;
        },
        dragLeave (e) {
            this.stopEvents(e);
            this.isHovered = false;
        },
        drop (e) {
            this.stopEvents(e);
            let sourcePath = normalizePath(e.dataTransfer.files[0].path);
            this.uploadImage(sourcePath);
        },
        remove (e) {
            e.preventDefault();
            this.filePath = '';
            this.$refs['input'].value = '';
            this.isEmpty = true;
            this.onRemove();
        },
        valueChanged (e) {
            if(!e.target.files.length) {
                return;
            }

            let sourcePath = normalizePath(e.target.files[0].path);
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

            if (this.postId || this.postId === 0) {
                uploadData.id = this.postId;
                uploadData.imageType = 'featuredImages';
            }

            ipcRenderer.send('app-image-upload', uploadData);

            ipcRenderer.once('app-image-uploaded', (event, data) => {
                this.isEmpty = false;
                this.isHovered = false;
                this.filePath = normalizePath(data.baseImage.newPath);
                this.isUploading = false;
            });
        },
        setImage (newPath, addMedia = false) {
            this.filePath = newPath;

            if (addMedia) {
                this.filePath = this.mediaPath + newPath;
            }

            if (newPath !== '') {
                this.isEmpty = false;
            } else {
                this.isEmpty = true;
            }
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.upload {
    &-image {
        background: $color-9;
        background-clip: padding-box;
        background-position: center;
        background-repeat: no-repeat;
        border: 2px dashed $color-8;
        border-radius: 3px;
        color: $color-6;
        display: block;
        margin: 0 0 -40px 0;
        text-align: center;
        padding: 5rem;
        position: relative;
        width: 100%;

        &.is-small {
            padding: 2rem;

            .upload-overlay {
                svg {
                    margin: 1.5rem auto;
                }
            }
        }

        &-wrapper {
            display: block;
            padding: 0 0 40px 0;

            &:not(.is-empty):not(.is-hovered) {
                background-color: $color-10;
                background-clip: content-box;
                background-image:   linear-gradient(45deg, #aaa 25%, transparent 25%, transparent 75%, #aaa 75%, #aaa),
                                    linear-gradient(45deg, #aaa 25%, transparent 25%, transparent 75%, #aaa 75%, #aaa);
                background-size:36px 36px;
                background-position:0 0, 18px 18px;
            }
        }

        &.is-empty {
            box-shadow: inset 0 0 0 5px $color-10;
        }

        &.is-empty {
            .upload-overlay {
                display: block;
            }
        }

        &-input {
            clear: both;
            display: block;
            line-height: 1.6!important;
            margin: 2rem auto 0 auto!important;
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

        &.is-hovered {
            border-color: $color-1;
        }

        &:not(.is-empty):not(.is-hovered) {
            background-color: transparent;
            background-position: center center;
            background-repeat: no-repeat;
            background-size: contain;
            border: none;
            padding: 10rem;

            &.is-small {
                padding: 9rem;
            }
        }
    }

    &-remove {
        color: $color-3;
        display: block;
        font-size: 13px;
        margin: 10px 0;
        position: relative;
        text-align: center;
        top: 40px;
        width: 100%;

        &.is-hidden {
            display: none;
        }
    }

    &-overlay {
        color: $color-7;
        display: none;

        svg {
            display: block;
            fill: $color-8;
            height: 6.4rem;
            margin: 1rem auto 1.5rem;
            width: 6.4rem;
        }
    }

    &-uploading-overlay {
        background: $color-9;
        height: 100%;
        left: 0;
        position: absolute;
        top: 0;
        width: 100%;

        & > div {
            color: $color-7!important;
            left: 50%;
            position: absolute;
            top: 50%;
            transform: translateX(-50%) translateY(-50%);
            width: 100%;               
        }
        
        .loader {
            display: block;               
            height: 2.8rem;
            margin: 0 auto 1rem;
            width: 2.8rem;
            
            & > span {
                animation: spin .9s infinite linear;
                border-top: 2px solid rgba($color-1, 0.2);
                border-right: 2px solid rgba($color-1, 0.2);
                border-bottom: 2px solid rgba($color-1, 0.2);
                border-left: 2px solid $color-1;
                border-radius: 50%;
                display: block;   
                height: 2.5rem;
                width: 2.5rem;                 
                
                &::after {
                    border-radius: 50%;
                    content: "";
                    display: block;                                      
                }
            
                @at-root {
                    @keyframes spin {
                       100% { 
                          transform: rotate(360deg);
                       }                  
                    }
                }
          }                
       }
    }
}

.settings-basic {
    .upload {
        display: block;
        margin-bottom: 40px;
    }
}
</style>
