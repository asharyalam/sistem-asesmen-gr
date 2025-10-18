"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface AnalysisInterpretationCardProps {
  title: string;
  description: string;
  interpretationPoints: { title: string; description: string; }[];
}

const AnalysisInterpretationCard: React.FC<AnalysisInterpretationCardProps> = ({
  title,
  description,
  interpretationPoints,
}) => {
  return (
    <Card className="rounded-xl shadow-mac-md border-l-4 border-blue-500">
      <CardHeader className="flex flex-row items-center space-x-2 pb-2">
        <Info className="h-5 w-5 text-blue-500" />
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <ul className="list-disc pl-5 space-y-2">
          {interpretationPoints.map((point, index) => (
            <li key={index}>
              <span className="font-medium text-foreground">{point.title}:</span>{' '}
              <span className="text-muted-foreground">{point.description}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default AnalysisInterpretationCard;