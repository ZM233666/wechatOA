Component({
  properties: {
    statusType: {
      type: String,
      value: 'idle',
    },
    statusText: {
      type: String,
      value: '',
    },
    apiBaseUrl: {
      type: String,
      value: '',
    },
    checking: {
      type: Boolean,
      value: false,
    },
  },
  methods: {
    onCheck() {
      this.triggerEvent('check');
    },
  },
});
