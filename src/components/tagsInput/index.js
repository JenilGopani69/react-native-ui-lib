import React from 'react';
import {
  StyleSheet,
  ViewPropTypes,
  Image,
  DeviceEventEmitter,
} from 'react-native';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {BaseComponent} from '../../commons';
import {Constants} from '../../helpers';
import {TextInput} from '../inputs';
import View from '../view';
import TouchableOpacity from '../touchableOpacity';
import Text from '../text';
import {Colors, BorderRadiuses, ThemeManager, Typography} from '../../style';
import Assets from '../../assets';

// todo: support backspace to remove tags
// todo: support updating tags externally

/**
 * Tags input component (chips)
 * @modifiers: text, color
 */
export default class TagsInput extends BaseComponent {
  static displayName = 'TagsInput';
  static propTypes = {
    /**
     * list of tags. can be string or custom object when implementing getLabel
     */
    tags: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    ),
    /**
     * callback for extracting the label out of the tag item
     */
    getLabel: PropTypes.func,
    /**
     * callback for custom rendering tag item
     */
    renderTag: PropTypes.func,
    /**
     * callback for onChangeTags event
     */
    onChangeTags: PropTypes.func,
    /**
     * callback for creating new tag out of input value (good for composing tag object)
     */
    onCreateTag: PropTypes.func,
    /**
     * callback for when pressing a tag in the following format (tagIndex, markedTagIndex) => {...}
     */
    onTagPress: PropTypes.func,
    /**
     * if true, tags *removal* Ux won't be available
     */
    disableTagRemoval: PropTypes.bool,
    /**
     * if true, tags *adding* Ux (i.e. by 'submitting' the input text) won't be available
     */
    disableTagAdding: PropTypes.bool,
    /**
     * custom styling for the component container
     */
    containerStyle: ViewPropTypes.style,
    /**
     * custom styling for the tag item
     */
    tagStyle: ViewPropTypes.style,
    /**
     * custom styling for the text input
     */
    inputStyle: TextInput.propTypes.style,
    /**
     * should hide input underline
     */
    hideUnderline: PropTypes.bool,
  };

  constructor(props) {
    super(props);

    this.addTag = this.addTag.bind(this);
    this.onChangeText = this.onChangeText.bind(this);
    this.renderTagWrapper = this.renderTagWrapper.bind(this);
    this.renderTag = this.renderTag.bind(this);
    this.getLabel = this.getLabel.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);
    this.markTagIndex = this.markTagIndex.bind(this);

    this.state = {
      value: props.value,
      tags: props.tags,
      tagIndexToRemove: undefined,
    };
  }

  componentDidMount() {
    DeviceEventEmitter.addListener('onBackspacePress', this.onKeyPress);
  }

  componentWillUnmount() {
    DeviceEventEmitter.removeListener('onBackspacePress', this.onKeyPress);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.tags !== this.state.tags) {
      this.setState({
        tags: nextProps.tags,
      });
    }
  }

  addTag() {
    const {onCreateTag, disableTagAdding} = this.props;
    const {value, tags} = this.state;
    if (disableTagAdding) return;
    if (_.isEmpty(value.trim())) return;

    const newTag = _.isFunction(onCreateTag) ? onCreateTag(value) : value;
    const newTags = [...tags, newTag];
    this.setState({
      value: '',
      tags: newTags,
    });
    _.invoke(this.props, 'onChangeTags', newTags);
    this.input.clear();
  }

  removeMarkedTag() {
    const {tags, tagIndexToRemove} = this.state;
    if (!_.isUndefined(tagIndexToRemove)) {
      tags.splice(tagIndexToRemove, 1);
      this.setState({
        tags,
        tagIndexToRemove: undefined,
      });
      _.invoke(this.props, 'onChangeTags', tags);
    }
  }

  markTagIndex(tagIndex) {
    this.setState({tagIndexToRemove: tagIndex});
  }

  onChangeText(value) {
    this.setState({value, tagIndexToRemove: undefined});
    _.invoke(this.props, 'onChangeText', value);
  }

  onTagPress(index) {
    const {onTagPress} = this.props;
    const {tagIndexToRemove} = this.state;

    // custom press handler
    if (onTagPress) {
      onTagPress(index, tagIndexToRemove);
      return;
    }

    // default press handler
    if (tagIndexToRemove === index) {
      this.removeMarkedTag();
    } else {
      this.markTagIndex(index);
    }
  }

  isLastTagMarked() {
    const {tags, tagIndexToRemove} = this.state;
    const tagsCount = _.size(tags);
    const isLastTagMarked = tagIndexToRemove === tagsCount - 1;
    return isLastTagMarked;
  }

  onKeyPress(event) {
    _.invoke(this.props, 'onKeyPress', event);

    if (this.props.disableTagRemoval) {
      return;
    }

    const {value, tags, tagIndexToRemove} = this.state;
    const tagsCount = _.size(tags);
    const keyCode = _.get(event, 'nativeEvent.key');
    const hasNoValue = _.isEmpty(value);
    const pressedBackspace = Constants.isAndroid || keyCode === 'Backspace';
    const hasTags = tagsCount > 0;

    if (pressedBackspace) {
      if (hasNoValue && hasTags && _.isUndefined(tagIndexToRemove)) {
        this.setState({
          tagIndexToRemove: tagsCount - 1,
        });
      } else if (!_.isUndefined(tagIndexToRemove)) {
        this.removeMarkedTag();
      }
    }
  }

  getLabel(item) {
    const {getLabel} = this.props;
    if (getLabel) {
      return getLabel(item);
    }

    if (_.isString(item)) {
      return item;
    }
    return _.get(item, 'label');
  }

  renderLabel(tag, shouldMarkTag) {
    const typography = this.extractTypographyValue();
    return (
      <View row centerV>
        {shouldMarkTag &&
          <Image style={styles.removeIcon} source={Assets.icons.x} />}
        <Text style={[styles.tagLabel, typography]}>
          {shouldMarkTag ? 'Remove' : this.getLabel(tag)}
        </Text>
      </View>
    );
  }

  renderTag(tag, index) {
    const {tagStyle, renderTag} = this.props;
    const {tagIndexToRemove} = this.state;
    const shouldMarkTag = tagIndexToRemove === index;
    if (_.isFunction(renderTag)) {
      return renderTag(tag, index, shouldMarkTag, this.getLabel(tag));
    }
    return (
      <View
        key={index}
        style={[styles.tag, tagStyle, shouldMarkTag && styles.tagMarked]}
      >
        {this.renderLabel(tag, shouldMarkTag)}
      </View>
    );
  }

  renderTagWrapper(tag, index) {
    return (
      <TouchableOpacity
        key={index}
        activeOpacity={1}
        onPress={() => this.onTagPress(index)}
      >
        {this.renderTag(tag, index)}
      </TouchableOpacity>
    );
  }

  renderTextInput() {
    const {containerStyle, inputStyle, ...others} = this.props;
    const {value} = this.state;
    const isLastTagMarked = this.isLastTagMarked();
    return (
      <View style={styles.inputWrapper}>
        <TextInput
          ref={r => (this.input = r)}
          text80
          blurOnSubmit={false}
          {...others}
          value={value}
          onSubmitEditing={this.addTag}
          onChangeText={this.onChangeText}
          onKeyPress={this.onKeyPress}
          enableErrors={false}
          hideUnderline
          selectionColor={isLastTagMarked ? 'transparent' : undefined}
          style={inputStyle}
          containerStyle={{flexGrow: 0}}
        />
      </View>
    );
  }

  render() {
    const {disableTagRemoval} = this.props;
    const tagRenderFn = disableTagRemoval ? this.renderTag : this.renderTagWrapper;

    const {containerStyle, hideUnderline} = this.props;
    const {tags} = this.state;
    return (
      <View style={[!hideUnderline && styles.withUnderline, containerStyle]}>
        <View style={styles.tagsList}>
          {_.map(tags, tagRenderFn)}
          {this.renderTextInput()}
        </View>
      </View>
    );
  }
}

const GUTTER_SPACING = 8;
const styles = StyleSheet.create({
  withUnderline: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeManager.dividerColor,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  inputWrapper: {
    flexGrow: 1,
    minWidth: 120,
    marginVertical: GUTTER_SPACING / 2,
    paddingVertical: 4.5,
  },
  tag: {
    backgroundColor: Colors.blue30,
    borderRadius: BorderRadiuses.br100,
    paddingVertical: 4.5,
    paddingHorizontal: 12,
    marginRight: GUTTER_SPACING,
    marginVertical: GUTTER_SPACING / 2,
  },
  tagMarked: {
    backgroundColor: Colors.dark10,
  },
  removeIcon: {
    tintColor: Colors.white,
    width: 10,
    height: 10,
    marginRight: 6,
  },
  tagLabel: {
    ...Typography.text80,
    color: Colors.white,
  },
});
