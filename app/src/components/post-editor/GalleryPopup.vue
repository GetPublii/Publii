<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup gallery-popup">
            <h1>Insert/Edit Gallery</h1>

            <div class="gallery-popup-images">
                <draggable
                    v-if="!isUploading"
                    tag="ul"
                    group="gallery-items"
                    chosenClass="is-chosen"
                    ghostClass="is-ghost"
                    class="gallery-popup-images-list"
                    v-model="images">
                    <li
                        v-for="(image, index) of images"
                        :data-id="index"
                        :key="'images-list-' + index"
                        class="gallery-popup-images-list-item">
                        <img
                            :src="image.thumbnailPath"
                            alt=""
                            :data-full-image="image.fullImagePath"
                            :data-size="image.dimensions" />

                        <div>                            
                            <input
                                type="text"
                                class="gallery-popup-images-list-item-alt"
                                v-model="image.alt"
                                placeholder="Image alternative text" />
                            <input
                                type="text"
                                class="gallery-popup-images-list-item-caption"
                                v-model="image.caption"
                                placeholder="Image caption" />
                        </div>

                        <div class="gallery-popup-images-list-operations">
                            <a
                                href="#up"
                                @click.prevent="moveImage(index, 'up')">
                                &lsaquo;
                            </a>

                            <a
                                href="#remove"
                                @click.prevent="removeImage(index)">
                                &times;
                            </a>

                            <a
                                href="#down"
                                @click.prevent="moveImage(index, 'down')">
                                &lsaquo;
                            </a>
                        </div>
                    </li>
                </draggable>

                <div
                    v-if="isUploading"
                    class="loading-state">
                    <icon
                        name="gallery"                       
                        customHeight="50"
                        customWidth="66" />

                    <progress-bar
                        color="blue"
                        :progress="progress"
                        :stopped="false"
                        :message="uploadMessage" />
                </div>
            </div>

            <div class="gallery-popup-config">
                <label>
                    Layout:
                    <select
                        v-model="columns"
                        class="gallery-popup-config-cols">
                        <option :value="1">1 column</option>
                        <option :value="2">2 columns</option>
                        <option :value="3">3 columns</option>
                        <option :value="4">4 columns</option>
                        <option :value="5">5 columns</option>
                        <option :value="6">6 columns</option>
                        <option :value="7">7 columns</option>
                        <option :value="8">8 columns</option>
                    </select>
                </label>

                <p-button
                    @click.native="addImages"
                    slot="buttons"
                    type="primary icon"
                    icon="add-site-mono">
                    <template v-if="!isUploading">Add images</template>
                    <template v-if="isUploading">Loading...</template>
                </p-button>
            </div>

            <div class="buttons">
                <p-button
                    type="medium no-border-radius half-width"
                    @click.native="save">
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
import Vue from 'vue';
import { remote, ipcRenderer} from 'electron';
import Draggable from 'vuedraggable';
const mainProcess = remote.require('./main');

export default {
    name: 'gallery-popup',
    components: {
        'draggable': Draggable
    },
    data () {
        return {
            postID: 0,
            galleryElement: null,
            isVisible: false,
            isUploading: false,
            images: [],
            columns: 3,
            uploadProgress: 0,
            uploadMessage: '',
            imagesToUpload: 0
        };
    },
    computed: {
        progress () {
            return (this.uploadProgress / this.imagesToUpload) * 100;
        }
    },
    mounted () {
        this.$bus.$on('update-gallery-popup', config => {
            this.postID = config.postID;
            this.galleryElement = config.galleryElement;
            this.isVisible = true;
            this.isUploading = false;
            this.images = [];
            this.columns = 3;
            this.imagesToUpload = 0;
            this.parseInputElement();

            if (!this.images.length) {
                this.addImages();
            }
        });
    },
    methods: {
        addImages () {
            mainProcess.selectFiles(false, [
                {
                    name: 'Images',
                    extensions: ['jpg', 'jpeg', 'png']
                }
            ]);

            ipcRenderer.removeAllListeners('app-files-selected');
            ipcRenderer.once('app-files-selected', (event, data) => {
                if(data.paths !== undefined) {
                    this.isUploading = true;
                    this.imagesToUpload = data.paths.length;
                    this.uploadProgress = 0;
                    this.uploadMessage = '';
                    this.loadImages(data.paths);
                }
            });
        },
        loadImages(imagesPaths) {
            let nextImagePath = imagesPaths.shift();

            ipcRenderer.send('app-image-upload', {
                id: this.postID,
                site: this.$store.state.currentSite.config.name,
                path: nextImagePath,
                imageType: 'galleryImages'
            });

            ipcRenderer.once('app-image-uploaded', (event, data) => {
                this.uploadProgress = this.uploadProgress + 1;
                this.uploadMessage = `Uploading ${this.uploadProgress} of ${this.imagesToUpload} pictures`;

                this.images.push({
                    fullImagePath: data.baseImage.url,
                    thumbnailPath: data.thumbnailPath[0],
                    thumbnailHeight: data.thumbnailDimensions ? data.thumbnailDimensions.height : '',
                    thumbnailWidth: data.thumbnailDimensions ? data.thumbnailDimensions.width : '',
                    dimensions: data.baseImage.size.join('x'),
                    alt: '',
                    caption: ''
                });

                if(imagesPaths.length) {
                    this.loadImages(imagesPaths);
                } else {
                    this.isUploading = false;
                }
            });
        },

        removeImage(index) {
            this.images.splice(index, 1);
        },

        parseInputElement () {
            let galleryHandler = $(this.galleryElement);
            let images = $(galleryHandler).find('.gallery__item');
            this.columns = galleryHandler.attr('data-columns') || 3;

            if(!images.length) {
                return;
            }

            for(let image of images) {
                image = $(image);

                this.images.push({
                    fullImagePath: image.find('a').attr('href'),
                    thumbnailPath: image.find('img').attr('src'),
                    thumbnailHeight: image.find('img').attr('height') ? image.find('img').attr('height') : '',
                    thumbnailWidth: image.find('img').attr('width') ? image.find('img').attr('width') : '',
                    alt: image.find('img').attr('alt'),
                    caption: image.find('figcaption').text(),
                    dimensions: image.find('a').attr('data-size')
                });
            }
        },

        save () {
            this.isVisible = false;
            this.$bus.$emit('gallery-popup-updated', this.generateOutput());
        },

        cancel () {
            this.isVisible = false;
            this.$bus.$emit('gallery-popup-updated', false);
        },

        moveImage(index, direction) {
            index = parseInt(index, 10);
            let tempMoved = JSON.parse(JSON.stringify(this.images[index]));
            let tempReplaced;

            if(direction === 'up') {
                tempReplaced = JSON.parse(JSON.stringify(this.images[index - 1]));
                Vue.set(this.images, index - 1, tempMoved);
            } else {
                tempReplaced = JSON.parse(JSON.stringify(this.images[index + 1]));
                Vue.set(this.images, index + 1, tempMoved);
            }

            Vue.set(this.images, index, tempReplaced);
        },

        generateOutput() {
            let output = '';

            for(let i = 0; i < this.images.length; i++) {
                let img = this.images[i];
                let description = ``;

                if(img.caption !== '') {
                    description = `<figcaption class="gallery__item-description">${img.caption}</figcaption>`;
                }

                let link = `<a href="${img.fullImagePath}" data-size="${img.dimensions}"><img src="${img.thumbnailPath}" alt="${img.alt}" /></a>`;

                if(img.thumbnailWidth === '') {
                    link = `<a href="${img.fullImagePath}" data-size="${img.dimensions}"><img src="${img.thumbnailPath}" alt="${img.alt}" /></a>`;
                } else {
                    link = `<a href="${img.fullImagePath}" data-size="${img.dimensions}"><img src="${img.thumbnailPath}" alt="${img.alt}" height="${img.thumbnailHeight}" width="${img.thumbnailWidth}" /></a>`;
                }

                let item = `<figure class="gallery__item">${link}${description}</figure>`;
                output += item;
            }

            if(!this.images.length) {
                output = '&nbsp;';
            }

            $(this.galleryElement).attr('data-columns', this.columns);

            return {
                gallery: this.galleryElement,
                html: output
            };
        }
    },
    beforeDestroy () {
        this.$bus.$off('update-gallery-popup');
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/popup-common.scss';

.overlay {
    z-index: 100005;
}

h1 {
    text-align: center;
}

.gallery-popup {    
    max-width: 70rem;
    min-width: 70rem;   
    padding: 0 0 4rem 0;  

    h1 {
        margin: 4rem 0 2rem 0;
    }

    &-buttons {
        margin: 0;
    }

    &-config {       
        display: flex;
        padding: 1.5rem 3rem;
        position: relative;
        
        &:after {
            background: linear-gradient(transparent, var(--popup-bg)); 
            bottom: 100%;
            content: "";
            height: 40px;
            left: 0;
            pointer-events: none;
            position: absolute;
            right: 0;           
            z-index: 1;
        }

        & > * {
            width: auto;
        }

        .button {
            margin-left: auto;
        }

        label {
            align-items: center;
            display: flex;
            width: 280px;
        }

        select {
            -webkit-appearance: none;
            background-color: var(--input-bg);
            border: none;
            border-radius: 3px;
            box-shadow: inset 0 0 0 1px var(--input-border-color);
            color: var(--text-primary-color);
            font: 400 1.6rem/1.5 var(--font-base);
            margin-left: auto;
            max-width: 100%;
            min-width: 100px;
            min-height: 48px;
            outline: none;
            padding: 0 12px 0 18px;
            position: relative;
            width: 200px;

            &:not([multiple]) {
                background: url('data:image/svg+xml;utf8,<svg fill="%238e929d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><polygon points="10 0 5 0 0 0 5 6 10 0"/></svg>') no-repeat calc(100% - 2rem) 50%;
                background-color: var(--input-bg);
                background-size: 10px;
                padding-right: 3rem;
            }
        }
    }

    .loading-state {
        padding: 2rem 4rem;

        svg {
            fill: var(--icon-secondary-color);
            margin: 3rem 0 0 0;
        }
    }

    &-images-list {
        list-style-type: none;
        min-height: 400px;
        margin: 0;
        max-height: 600px;
        overflow: scroll;
        padding: 0 3rem 20px;

        &:empty {
            min-height: 400px;
            position: relative;

            &:after {
                content: "Your gallery is empty";
                color: var(--label-color);
                position: absolute;
                top: 50%;
                transform: translateX(-50%) translateY(-50%);
            }
        }

        &-item {
            align-items: center;           
            display: grid;
            grid-template-columns: auto 1fr 15px;
            padding: 1rem 0;

            &:first-child {                

                .gallery-popup-images-list-operations {
                    & > a[href="#up"] {
                        display: none;
                    }
                }
            }

            &:last-child {
                .gallery-popup-images-list-operations {
                    & > a[href="#down"] {
                        display: none;
                    }
                }
            }

            img {
                cursor: move;
                max-height: 90px;
                width: 90px;
            }

            & > div {
                display: flex;
                flex-wrap: wrap;
                padding: 0 2rem;               

                & > * {
                    width: 100%;
                }

                & > span {
                    font-size: 1.3rem;
                    font-weight: var(--font-weight-semibold);
                    line-height: 1;
                    padding: 0 0 .5rem 0;
                    text-align: left;
                }

                & > input {                    
                    margin: 5px 0;                    
                }
            }

            & > .gallery-popup-images-list-operations {
                align-self: normal;
                margin: 5px 0;
                padding: 0;
                position: relative;                

                & > a {
                    border-radius: 50%;
                    font-size: 2.4rem;
                    height: 3rem; 
                    left: 0;
                    line-height: 1.1; 
                    text-align: center;       
                    transition: var(--transition);   
                    position: absolute;
                    width: 3rem;

                    &[href="#remove"] {
                        color: var(--warning);
                        top: 50%;
                        transform: translateY(-60%);
                    }

                    &[href="#up"],
                    &[href="#down"] {
                         color: var(--icon-secondary-color);
                        
                         &:active,
                         &:focus,
                         &:hover {
                             color: var(--icon-tertiary-color);
                         }
                    }

                    &[href="#up"] {                      
                        top: 0;
                        transform: rotate(90deg);
                    }

                    &[href="#down"] {
                        bottom: 0;                       
                        transform: rotate(-90deg);
                    }                    
        
                    &:hover {
                        background: var(--input-border-color);
                    }
                }
            }
        }
    }
}

.buttons {
    display: flex;
    margin: 0 0 -4rem 0;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
