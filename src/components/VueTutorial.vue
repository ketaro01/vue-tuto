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
import {
  CLICK_EVENT,
  DEBOUNCE_DELAY,
  END_REASON,
  JUMP_DELAY,
  THROTTLE_DELAY,
} from '@/lib/constants';
import { dataStorage } from '@/lib/DataStorage';

export default {
  name: 'VueTutorial',
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
      default: CLICK_EVENT.NEXT,
      validator: (value) => (
        [CLICK_EVENT.NEXT, CLICK_EVENT.SKIP, CLICK_EVENT.PAUSE].indexOf(value) !== -1
      ),
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
      showTooltip: false,
      jumpPending: false,
      spotlightStyle: {},
      stepIndex: -1,
      tutorialCount: 0,
      fullHeight: 0,
      // target element
      target: null,
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
      this.stepEnd(END_REASON.DESTROY);
    }
    if (this.$el.parentNote) {
      this.$el.parentNote.removeChild(this.$el);
    }
  },
  methods: {
    /**
     * 화면이 리사이즈 되는 경우 이벤트를 초기화 처리
     */
    resizeWindow: throttle(async function resize() {
      await this.initTour();
      this.resetStep();
    }, THROTTLE_DELAY),

    /**
     * reset 이벤트 resize 이벤트와 반복되지 않기위해 디바운싱 처리
     */
    resetStep: debounce(function step() {
      this.step(0);
    }, DEBOUNCE_DELAY),

    /**
     * setTimeout 이벤트를 발생시켜 화면을 새로 그림
     * @param {number} time ms
     */
    reRender(time = 0) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, time);
      });
    },

    /**
     * Step end 이벤트
     * @param {string} reason
     */
    stepEnd(reason) {
      this.tour = false;
      this.stepIndex = -1;
      this.$emit('end', reason);
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

    /**
     * tutorial start 함수
     */
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
        this.stepEnd(END_REASON.LIMIT);
      }

      this.tour = true;

      this.step();
    },

    /**
     * tutorial step event
     * @param {number} value step add value
     */
    step(value = 1) {
      this.stepIndex += value;

      if (!this.steps[this.stepIndex]) {
        this.stepEnd(END_REASON.END);
        dataStorage.setStorageItem(this.tutorialName, this.tutorialCount + 1);
        return;
      }
      this.startTour(this.steps[this.stepIndex], value === 0);
    },

    /**
     *
     * @param {string} name tutorial key
     * @param {number|string} count tutorial limit count
     */
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
     * tour start
     * @param {object} step step info
     * @param {boolean} skipJump skip jump
     */
    async startTour(step, skipJump) {
      if (!step) {
        console.error('invalid step');
        return;
      }

      const {
        target,
        useJump,
        duration = 1000,
        offset = -100,
        padding = 10,
      } = step;

      this.target = document.querySelector(target);

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

    /**
     * spotlight 영역으로 jump 를 해주기위한 함수.
     * @param {Element} spotlight
     * @param {number} duration
     * @param {number} offset
     */
    jumpToSpotlight(spotlight, duration, offset) {
      if (this.jumpPending) {
        this.reRender(JUMP_DELAY).then(() => {
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

    /**
     * button option 생성
     * @param {object} option
     * @param {string} text
     * @returns {{lastText: (*|string), style: *, text: *}}
     */
    getButtonOption(option, text) {
      const buttonOption = option || {};
      return {
        text: buttonOption.text || text,
        lastText: buttonOption.lastText || 'close',
        style: buttonOption.style,
      };
    },

    /**
     * offset 정보 생성
     * @param {HTMLElement} el
     * @returns {{top: number, left: number}}
     */
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

    /**
     * ClientRect 생성
     * @param {HTMLElement} element
     * @returns {{}|ClientRect|DOMRect}
     */
    getClientRect(element) {
      if (!element) return {};

      return element.getBoundingClientRect();
    },

    /**
     * overlay click 이벤트
     */
    handleOverlayClick() {
      switch (this.overlayMode) {
        case CLICK_EVENT.NEXT: this.handleNextStep(); break;
        case CLICK_EVENT.SKIP: this.handleSkip(); break;
        case CLICK_EVENT.PAUSE: break;
        default: break;
      }
    },
    /**
     * Next Button 클릭 이벤트
     */
    handleNextStep() {
      this.step(1);
    },

    /**
     * Prev Button 클릭 이벤트
     */
    handlePrevStep() {
      this.step(-1);
    },

    /**
     * Skip Button 클릭 이벤트
     */
    handleSkip() {
      this.stepEnd(END_REASON.END);
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
