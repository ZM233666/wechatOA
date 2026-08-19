Component({
  properties: {
    title: {
      type: String,
      value: '',
    },
    subtitle: {
      type: String,
      value: '',
    },
    moreText: {
      type: String,
      value: '更多 >',
    },
    showMore: {
      type: Boolean,
      value: false,
    },
  },
  methods: {
    onMoreTap() {
      this.triggerEvent('more');
    },
  },
});
