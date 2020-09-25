<template>
  <div
    v-if="tour"
  >
    <div
      :class="['overlay', { legacy: isIE }]"
      :style="overlayStyle"
      @click="handleOverlayClick"
    >
      <div
        class="spotlight"
        :style="spotlightStyle"
      />
    </div>
    <div
      :class="['my-tooltip', { show: showTooltip }]"
    >
      <slot
        name="tooltip"
        :item="currentItem"
        :next-item="nextItem"
        :next-step="handleNextStep"
        :prev-item="prevItem"
        :prev-step="handlePrevStep"
        :skip="handleSkip"
        :step-index="stepIndex"
      >
        <div
          class="tooltip-message"
          v-html="currentItem.content"
        />
        <div />
        <div class="tooltip-actions">
          <div class="spacer" />
          <button
            v-if="showSkip || currentItem.showSkip"
            :style="skipButton.style"
            @click="handleSkip"
          >
            {{ skipButton.text }}
          </button>
          <button
            v-if="prevItem"
            :style="prevButton.style"
            @click="handlePrevStep"
          >
            {{ prevButton.text }}
          </button>
          <button
            :style="nextButton.style"
            @click="handleNextStep"
          >
            {{ nextItem ? nextButton.text : nextButton.lastText }}
          </button>
        </div>
        <div
          class="arrow"
          data-popper-arrow
        />
      </slot>
    </div>
  </div>
</template>
<script>
import { throttle, debounce } from 'lodash-es';
import jump from 'jump.js';
import { createPopper } from '@popperjs/core';
import { dataStorage } from '@/lib/DataStorage';

export default {
  name: 'Tutorial',
  props: {
    buttonOption: {
      type: Object,
      default: () => ({}),
    },
    maxCount: {
      type: [Number, String],
      default: 0,
    },
    overlayMode: {
      type: String,
      default: 'next',
      validator: (value) => ['next', 'pause', 'skip'].indexOf(value) !== -1,
    },
    params: {
      type: Object,
      default: () => ({}),
    },
    run: {
      type: Boolean,
      default: false,
    },
    steps: {
      type: Array,
      default: () => [],
    },
    showSkip: {
      type: Boolean,
      default: false,
    },
    tutorialName: {
      type: String,
      default: 'tutorial',
    },
    useJump: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      tour: false,
      spotlightStyle: {},
      alertItemStyle: {},
      target: null,
      content: null,
      stepIndex: -1,
      tutorialCount: 0,
      showTooltip: false,
      fullHeight: 0,
      jumpPending: false,
    };
  },
  computed: {
    popperOptions() {
      return {
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
        ],
        ...this.params,
      };
    },
    nextItem() {
      return this.steps[this.stepIndex + 1];
    },
    prevItem() {
      return this.steps[this.stepIndex - 1];
    },
    currentItem() {
      return this.steps[this.stepIndex] || {};
    },
    skipButton() {
      return this.getButtonOption(this.buttonOption.skip, 'skip');
    },
    prevButton() {
      return this.getButtonOption(this.buttonOption.prev, 'prev');
    },
    nextButton() {
      return this.getButtonOption(this.buttonOption.next, 'next');
    },
    isIE() {
      return !!(navigator.userAgent.match(/msie|trident/i));
    },
    overlayStyle() {
      return {
        height: `${this.fullHeight}px`,
      };
    },
  },
  watch: {
    run: {
      immediate: true,
      handler(value) {
        if (value) this.start();
      },
    },
  },
  mounted() {
    if (this.$root.$el) {
      this.$root.$el.append(this.$el);
      window.addEventListener('resize', this.resizeWindow);
    }
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeWindow);
    if (this.tour) {
      this.stepEnd('destroyed');
    }
  },
  destroyed() {
    if (this.$el.parentNote) {
      this.$el.parentNote.removeChild(this.$el);
    }
  },
  methods: {
    resizeWindow: throttle(async function resize() {
      await this.initTour();
      this.resetStep();
    }, 200),

    resetStep: debounce(function step() {
      this.step(0);
    }, 300),

    reRender(time = 0) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, time);
      });
    },

    async initTour() {
      const { body, documentElement: html } = document;

      this.fullHeight = Math.max(
        body.offsetHeight,
        html.clientHeight,
        html.offsetHeight,
      );

      await this.reRender();

      this.fullHeight = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight,
      );
    },

    async start() {
      if (this.tour) {
        this.tour = false;
        await this.reRender();
        this.tour = true;
      }

      await this.initTour();

      if (!this.steps || !this.steps.length) {
        console.error('invalid steps');
        return;
      }

      if (!this.checkTutorialCount(this.tutorialName, this.maxCount)) {
        this.stepEnd('limit');
      }

      this.tour = true;

      this.step();
    },

    step(value = 1) {
      this.stepIndex += value;

      if (!this.steps[this.stepIndex]) {
        this.stepEnd('end');
        dataStorage.setStorageItem(this.tutorialName, this.tutorialCount + 1);
        return;
      }
      this.startTour(this.steps[this.stepIndex], value === 0);
    },

    checkTutorialCount(name, count) {
      const maxCount = parseInt(count, 10);

      // maxCount 가 0 이거나 name 정보가 없는 경우 maxCount 검증을 진행하지 않음.
      if (maxCount === 0 || Number.isNaN(maxCount) || !name) return true;

      const storageItem = dataStorage.getStorageItem(name);

      // tutorial maxCount 정보가 없거나 isNaN인 경우 0으로 초기화
      let tutorialCount = storageItem ? parseInt(storageItem, 10) : 0;
      if (Number.isNaN(tutorialCount)) tutorialCount = 0;

      this.tutorialCount = tutorialCount;

      // tutorialCount 가 maxCount 보다 적은 경우 카운트를 저장하고 return true;
      return tutorialCount < maxCount;
    },

    /**
     *
     * @param {Object} step step info
     * @param {boolean} skipJump skip jump
     */
    async startTour(step, skipJump) {
      if (!step) {
        console.error('invalid step');
        return;
      }

      const {
        target,
        content,
        useJump,
        duration = 1000,
        offset = -100,
        padding = 10,
      } = step;

      this.target = document.querySelector(target);
      this.content = content;

      if (!this.target) {
        console.error('invalid target element', target);
        this.step(1);
        return;
      }

      this.showTooltip = false;

      const elementRect = this.getClientRect(this.target);

      const {
        width,
        height,
      } = elementRect;

      const { top, left } = this.getOffset(this.target);

      const sWidth = width + padding * 2;
      const sHeight = height + padding * 2;
      const sTop = top - padding;
      const sLeft = left - padding;

      this.spotlightStyle = {
        width: `${sWidth}px`,
        height: `${sHeight}px`,
        top: `${sTop}px`,
        left: `${sLeft}px`,
      };

      await this.reRender();

      const spotlight = document.querySelector('.spotlight');
      const tooltip = document.querySelector('.my-tooltip');

      this.showTooltip = true;
      createPopper(spotlight, tooltip, this.popperOptions);

      if (!skipJump && (this.useJump || useJump)) {
        this.jumpToSpotlight(spotlight, duration, offset);
      }
    },
    jumpToSpotlight(spotlight, duration, offset) {
      if (this.jumpPending) {
        this.reRender(100).then(() => {
          this.jumpToSpotlight(spotlight, duration, offset);
        });
        return;
      }

      this.jumpPending = true;

      jump(spotlight, {
        duration,
        offset,
        callback: () => {
          if (this.jumpPending) {
            this.jumpPending = false;
          }
        },
        a11y: false,
      });
    },

    getButtonOption(option, text) {
      const buttonOption = option || {};
      return {
        text: buttonOption.text || text,
        lastText: buttonOption.lastText || 'close',
        style: buttonOption.style,
      };
    },
    getOffset(el) {
      let _x = 0;
      let _y = 0;
      let element = el;
      while (
        element
        && !Number.isNaN(element.offsetLeft)
        && !Number.isNaN(element.offsetTop)
      ) {
        _x += element.offsetLeft - element.scrollLeft;
        _y += element.offsetTop - element.scrollTop;
        element = element.offsetParent;
      }
      return { top: _y, left: _x };
    },
    getClientRect(element) {
      if (!element) return {};

      return element.getBoundingClientRect();
    },

    handleOverlayClick() {
      switch (this.overlayMode) {
        case 'next': this.handleNextStep(); break;
        case 'skip': this.handleSkip(); break;
        case 'pause': break;
        default: break;
      }
    },

    handleNextStep() {
      this.step(1);
    },

    handlePrevStep() {
      this.step(-1);
    },

    handleSkip() {
      this.stepEnd('skip');
    },
    stepEnd(reason) {
      this.tour = false;
      this.stepIndex = -1;
      this.$emit('end', reason);
    },
  },
};
</script>
<style lang="scss" scoped>

.overlay {
  z-index: 20;
  position: absolute;
  display: flex;
  background-color: black;
  opacity: 0.5;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  mix-blend-mode: hard-light;
  cursor: pointer;
  &.legacy {
    background-color: transparent;
    .spotlight {
      z-index: 30;
      position: absolute;
      border-radius: 4px;
      box-shadow: 0 0 0 9999px black, 0 0 15px rgba(0, 0, 0, 0.5);
    }
  }
  .spotlight {
    z-index: 30;
    position: absolute;
    background-color: gray;
    border-radius: 4px;
  }
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.my-tooltip {
  display: none;
  position: absolute;
  z-index: 30;
  background-color: white;
  color: black;
  padding: 10px;
  font-size: 14px;
  border-radius: 4px;
  animation: fadeIn .5s;
  &.show {
    display: block;
  }
  .tooltip-message {
    color: black;
    margin-bottom: 5px;
    text-align: left;
  }
  .tooltip-actions {
    display: flex;
    button {
      background-color: #3f51b5;
      color: white;
      font-weight: bold;
      padding: 5px 10px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-left: 5px;
      transition: opacity .25s;
      opacity: 1;
      border: none;
      &:focus {
        outline: 0 !important;
      }
      &:hover {
        opacity: 0.8;
      }
    }
  }
  .arrow,
  .arrow::before {
    position: absolute;
    width: 8px;
    height: 8px;
    z-index: -1;
  }
  .arrow::before {
    content: '';
    transform: rotate(45deg);
    background: white;
  }
  &[data-popper-placement^='top'] > .arrow {
    bottom: -4px;
  }

  &[data-popper-placement^='bottom'] > .arrow {
    top: -4px;
  }

  &[data-popper-placement^='left'] > .arrow {
    right: -4px;
  }

  &[data-popper-placement^='right'] > .arrow {
    left: -4px;
  }
}
.spacer {
  flex-grow: 1 !important;
}
</style>
