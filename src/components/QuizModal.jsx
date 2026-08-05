import React from 'react';
import Dialog, { DialogClose } from './Dialog.jsx';
import Button from './Button.jsx';
import ProductCard from './ProductCard.jsx';
import Icon from './Icon.jsx';
import { MOOD_TAGS, INTENSITY_TAGS } from '../lib/shopifyProducts.js';

const RANK_LABELS = ['Strongest match', 'Softer alternative', 'More adventurous'];

function QuizQuestion({ eyebrow, title, options, onAnswer }) {
  return <div className="quiz-question"><p className="overline dark">{eyebrow}</p><h2>{title}</h2><div>{options.map((option) => <button key={option} onClick={() => onAnswer(option)}><span>{option}</span><Icon name="arrowRight"/></button>)}</div></div>;
}

export default function QuizModal({ quizStep, quizAnswers, quizMatches, familyOptions, discoveryEnabled, discoveryPrice, wishlist, onToggleWishlist, mutating, onQuickAdd, onAnswer, onClose, onRetake, onAddSet, onSelectProduct, dialogRef }) {
  return <Dialog overlayClassName="quiz-layer" label="Scent finder" dialogRef={dialogRef}>
    <div className="quiz-modal">
      <DialogClose onClick={onClose} label="Close quiz" />
      <div className="quiz-progress"><span style={{ width: `${Math.min(100, ((quizStep + 1) / 5) * 100)}%` }}/></div>
      {quizStep === 0 && <QuizQuestion eyebrow="First, who is this for?" title="Are you choosing for yourself or someone else?" options={['Myself', 'Gift']} onAnswer={onAnswer}/>}
      {quizStep === 1 && <QuizQuestion eyebrow="The atmosphere" title="Which direction feels most natural?" options={familyOptions} onAnswer={onAnswer}/>}
      {quizStep === 2 && <QuizQuestion eyebrow="The feeling" title="How should the fragrance make them feel?" options={MOOD_TAGS} onAnswer={onAnswer}/>}
      {quizStep === 3 && <QuizQuestion eyebrow="The presence" title="How noticeable should it be?" options={INTENSITY_TAGS} onAnswer={onAnswer}/>}
      {quizStep >= 4 && <div className="quiz-result">
        <p className="overline dark">Your three-scent edit</p>
        <h2>{quizAnswers[0] === 'Gift' ? 'A thoughtful shortlist.' : 'Try these on your skin.'}</h2>
        <p>Varied enough to learn from, connected enough to feel personal.</p>
        <div className="rail-row">{quizMatches.map((product, index) => <ProductCard
          key={product.id}
          product={product}
          size="rail"
          eyebrow={RANK_LABELS[index] || RANK_LABELS[RANK_LABELS.length - 1]}
          mutating={mutating}
          wishlisted={wishlist.includes(product.id)}
          onToggleWishlist={onToggleWishlist}
          onOpen={onSelectProduct}
          onQuickAdd={onQuickAdd}
        />)}</div>
        {discoveryEnabled && discoveryPrice != null
          ? <Button full onClick={onAddSet}>Try all three — ${discoveryPrice}</Button>
          : <p className="quiz-hint">Tap a match above to view it and shop the real bottle.</p>}
        <button className="retake" onClick={onRetake}>Retake quiz</button>
      </div>}
    </div>
  </Dialog>;
}
