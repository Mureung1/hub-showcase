package com.punchman.devpulse.repository.mybatis;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface CertificationMentionMapper {

    @Select("""
            SELECT
                c.name                                                     AS certificationName,
                c.issuer                                                   AS issuer,
                cm.mention_count                                           AS mentionCount,
                cm.total_posting_count                                     AS totalPostingCount,
                CAST(cm.mention_count AS numeric) / cm.total_posting_count AS mentionRate,
                cm.essential_mention_count                                 AS essentialMentionCount,
                cm.preferred_mention_count                                 AS preferredMentionCount
            FROM certification_mention cm
            JOIN certification c ON c.id = cm.certification_id
            WHERE cm.job_title = #{jobTitle}
            ORDER BY mentionRate DESC, c.name ASC
            """)
    List<CertificationMentionAggregateRow> findRankingByJobTitle(@Param("jobTitle") String jobTitle);
}
