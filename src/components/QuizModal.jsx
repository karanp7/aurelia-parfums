import React from 'react';
import PerfumeBottle from './PerfumeBottle.jsx';
import Dialog, { DialogClose } from './Dialog.jsx';
import Button from './Button.jsx';
import { MOOD_TAGS, INTENSITY_TAGS } from '../lib/shopifyProducts.js';

function QuizQuestion({ eyebrow, title, options, onAnswer }) {
  return <div className="quiz-question"><p className="overline dark">{eyebrow}</p><h2>{title}</h2><div>{options.map((option) => <button key={option} onClick={() => onAnswer(option)}><span>{option}</span><span aria-hidden="true">→</span></button>)}</div></div>;
}

export default function QuizModal({ quizStep, quizAnswers, quizMatches, familyOptions, discoveryEnabled, discoveryPrice, onAnswer, onClose, onRetake, onAddSet, onSelectProduct, dialogRef }) {
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
        <div className="result-grid">{quizMatches.map((product, index) => <button key={product.id} onClick={() => onSelectProduct(product)}><span>{index === 0 ? 'Strongest match' : index === 1 ? 'Softer alternative' : 'More adventurous'}</span><div className={`mini-art tone-bg-${product.tone}`}><PerfumeBottle tone={product.tone} compact image={product.image} alt={product.imageAlt || product.name}/></div><h3>{product.name}</h3><p>{product.summary}</p></button>)}</div>
        {discoveryEnabled && discoveryPrice != null
          ? <Button full onClick={onAddSet}>Try all three — ${discoveryPrice}</Button>
          : <p className="quiz-hint">Tap a match above to view it and shop the real bottle.</p>}
        <button className="retake" onClick={onRetake}>Retake quiz</button>
      </div>}
    </div>
  </Dialog>;
}
