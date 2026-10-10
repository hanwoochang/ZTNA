import React, { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../ui/Icon';
import { DocumentSection } from './documents/DocumentSection';
import { NoticeSection } from './documents/NoticeSection';

export const DocumentsTab = ({
    email,
    isLoading,
    documents,
    fetchDocuments,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    notices,
    noticePage,
    noticeTotalPages,
    fetchNotices,
    createNotice,
    deleteNotice,
    updateNotice,
    styles,
    colors,
    allowDownload,
    userRole,
    userPositionLevel
}: any) => {
    useFocusEffect(
        useCallback(() => {
            fetchNotices(1);
            fetchDocuments();
        }, [])
    );

    return (
        <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ padding: 24, paddingBottom: 100, maxWidth: 800, width: '100%', alignSelf: 'center' }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
                <Icon name="shield" size={28} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.title, { textAlign: 'left', marginBottom: 0 }]}>Intelligence</Text>
            </View>

            {/* 기밀 문서 섹션 */}
            <DocumentSection 
                isLoading={isLoading}
                documents={documents}
                downloadDocument={downloadDocument}
                uploadDocument={uploadDocument}
                deleteDocument={deleteDocument}
                allowDownload={allowDownload}
                userRole={userRole}
                userPositionLevel={userPositionLevel}
                styles={styles}
                colors={colors}
            />

            {/* 공지사항 보드 섹션 */}
            <NoticeSection 
                email={email}
                notices={notices}
                noticePage={noticePage}
                noticeTotalPages={noticeTotalPages}
                fetchNotices={fetchNotices}
                createNotice={createNotice}
                deleteNotice={deleteNotice}
                updateNotice={updateNotice}
                userRole={userRole}
                userPositionLevel={userPositionLevel}
                styles={styles}
                colors={colors}
            />
        </ScrollView>
    );
};
